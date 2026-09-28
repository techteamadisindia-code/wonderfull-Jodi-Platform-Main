/**
 * Wonderful Jodi — Production Server for Hostinger
 * 
 * Orchestrates:
 * 1. Next.js Standalone frontend server on internal port
 * 2. Express backend API and proxy on public port (Hostinger PORT)
 * 3. Automatic self-healing build if standalone files are missing
 * 
 * Hostinger Startup File: start.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PUBLIC_PORT = parseInt(process.env.PORT, 10) || 5000;
const FRONTEND_PORT = parseInt(process.env.FRONTEND_PORT, 10) || (PUBLIC_PORT === 3000 ? 3001 : 3000);

process.env.PORT = String(PUBLIC_PORT);
process.env.FRONTEND_PORT = String(FRONTEND_PORT);

console.log('══════════════════════════════════════════════════');
console.log('  WONDERFUL JODI — Production Server Starting');
console.log(`  Public Port (API & Proxy): ${PUBLIC_PORT}`);
console.log(`  Internal Next.js Port:     ${FRONTEND_PORT}`);
console.log('══════════════════════════════════════════════════');

let frontendProcess = null;

const nextStandalonePath = path.join(__dirname, 'frontend', '.next', 'standalone');
const nextServerPath = path.join(nextStandalonePath, 'server.js');

function launchNextServer() {
  if (!fs.existsSync(nextServerPath)) {
    console.warn('[Frontend] Standalone server file not found at:', nextServerPath);
    return;
  }
  console.log(`[Frontend] Launching Next.js standalone on internal port ${FRONTEND_PORT}...`);
  frontendProcess = spawn(process.execPath, [nextServerPath], {
    cwd: nextStandalonePath,
    env: {
      ...process.env,
      PORT: String(FRONTEND_PORT),
      HOSTNAME: '127.0.0.1',
      NEXT_PUBLIC_BACKEND_URL: `http://127.0.0.1:${PUBLIC_PORT}`,
    },
    stdio: 'inherit',
  });

  frontendProcess.on('error', (err) => {
    console.error('[Frontend] Failed to spawn process:', err.message);
  });

  frontendProcess.on('exit', (code, signal) => {
    console.warn(`[Frontend] Process exited with code ${code}, signal ${signal}`);
  });
}

function startFrontend() {
  if (fs.existsSync(nextServerPath)) {
    launchNextServer();
  } else {
    console.log('[Frontend] Standalone build not found. Triggering automated build in background...');
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const buildProc = spawn(npmCmd, ['run', 'build:frontend'], {
      cwd: __dirname,
      stdio: 'inherit',
      env: process.env,
    });
    buildProc.on('exit', (code) => {
      if (code === 0 && fs.existsSync(nextServerPath)) {
        console.log('[Frontend] Build completed successfully! Launching Next.js standalone...');
        launchNextServer();
      } else {
        console.error('[Frontend] Build process completed with code', code);
      }
    });
  }
}

// ─── 1. Start Frontend (Immediate or Auto-building) ───
startFrontend();

// ─── 2. Start Express API Server ───
console.log(`\n[Backend] Starting Express server on port ${PUBLIC_PORT}...`);
require('./backend/dist/server.js');

// ─── 3. Graceful Process Cleanup ───
function handleShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  if (frontendProcess && !frontendProcess.killed) {
    try {
      frontendProcess.kill(signal);
    } catch (e) {
      // ignore
    }
  }
  process.exit(0);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
