/**
 * Wonderful Jodi — Production Server for Hostinger
 *
 * Architecture:
 * Browser
 *   ↓
 * Hostinger public PORT (process.env.PORT — assigned dynamically by Hostinger)
 *   ↓
 * Express Backend (backend/dist/server.js — listening on 0.0.0.0:PUBLIC_PORT)
 *   ├── /api/*       → Express API (Prisma / MySQL)
 *   ├── /uploads/*   → Express static uploads
 *   ├── /socket.io/* → Socket.IO realtime server
 *   ├── /health      → Server health status
 *   └── everything else → Proxied internally to Next.js on 127.0.0.1:FRONTEND_PORT
 *
 * Next.js standalone (child process on 127.0.0.1:FRONTEND_PORT — internal only)
 *   └── Rewrites / SSR /api/* → http://127.0.0.1:PUBLIC_PORT (Express backend)
 *
 * Hostinger Entry Point: app.js → start.js
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const http = require('http');

// ─────────────────────────────────────────────────────────────────────────────
// 1. PORT RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

const PUBLIC_PORT = parseInt(process.env.PORT, 10) || 3000;

// Derive internal Next.js port that never conflicts with PUBLIC_PORT
let FRONTEND_PORT = parseInt(process.env.FRONTEND_PORT, 10) || 0;
if (!FRONTEND_PORT || FRONTEND_PORT === PUBLIC_PORT) {
  FRONTEND_PORT = (PUBLIC_PORT === 3000 ? 3001 : (PUBLIC_PORT === 3001 ? 3002 : 3000));
}

// Internal backend URL for Next.js SSR and rewrites
const INTERNAL_BACKEND_URL = `http://127.0.0.1:${PUBLIC_PORT}`;

// Export required environment variables
process.env.PORT = String(PUBLIC_PORT);
process.env.FRONTEND_PORT = String(FRONTEND_PORT);
process.env.BACKEND_PORT = String(PUBLIC_PORT);
process.env.INTERNAL_BACKEND_URL = INTERNAL_BACKEND_URL;
process.env.BACKEND_INTERNAL_URL = INTERNAL_BACKEND_URL;

const NODE_ENV = process.env.NODE_ENV || 'production';

// ─────────────────────────────────────────────────────────────────────────────
// 2. STARTUP LOGGING
// ─────────────────────────────────────────────────────────────────────────────

console.log('');
console.log('========================================');
console.log('WONDERFUL JODI FULLSTACK PLATFORM');
console.log('========================================');
console.log(`NODE_ENV: ${NODE_ENV}`);
console.log(`Public PORT: ${PUBLIC_PORT}`);
console.log(`Frontend internal PORT: ${FRONTEND_PORT}`);
console.log('Backend: Express');
console.log('Frontend: Next.js standalone');
console.log('========================================');
console.log('');

// ─────────────────────────────────────────────────────────────────────────────
// 3. FILE PATHS & LIFECYCLE STATE
// ─────────────────────────────────────────────────────────────────────────────

const standaloneDir = path.join(__dirname, 'frontend', '.next', 'standalone');
const nextServerPath = path.join(standaloneDir, 'server.js');
const backendDistPath = path.join(__dirname, 'backend', 'dist', 'server.js');

let frontendProcess = null;
let isShuttingDown = false;
let isStartingFrontend = false;

// ─────────────────────────────────────────────────────────────────────────────
// 4. PORT CHECKING HELPER
// ─────────────────────────────────────────────────────────────────────────────

function isPortAvailable(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true);
      }
    });
    tester.once('listening', () => {
      tester.once('close', () => resolve(true)).close();
    });
    tester.listen(port, host);
  });
}

async function waitForPortAvailable(port, host = '127.0.0.1', timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const available = await isPortAvailable(port, host);
    if (available) {
      return true;
    }
    console.log(`[Frontend] Port ${host}:${port} is in use. Waiting for release...`);
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PATCH ROUTES MANIFEST
//
// In Next.js standalone, rewrites are baked into routes-manifest.json at build
// time. If built with a different port (e.g., 5000), Next.js will attempt to
// proxy to 127.0.0.1:5000 and throw ECONNREFUSED.
//
// We patch routes-manifest.json to point to the current runtime PUBLIC_PORT.
// ─────────────────────────────────────────────────────────────────────────────

function patchRoutesManifest() {
  const manifestLocations = [
    path.join(standaloneDir, '.next', 'routes-manifest.json'),
    path.join(standaloneDir, 'frontend', '.next', 'routes-manifest.json'),
    path.join(__dirname, 'frontend', '.next', 'routes-manifest.json'),
  ];

  for (const manifestPath of manifestLocations) {
    if (!fs.existsSync(manifestPath)) {
      continue;
    }

    try {
      const raw = fs.readFileSync(manifestPath, 'utf8');
      const patched = raw.replace(
        /https?:\/\/(127\.0\.0\.1|localhost):\d+/g,
        INTERNAL_BACKEND_URL
      );

      if (patched !== raw) {
        fs.writeFileSync(manifestPath, patched, 'utf8');
        console.log(`[Startup] routes-manifest.json patched at ${path.relative(__dirname, manifestPath)} → ${INTERNAL_BACKEND_URL}`);
      }
    } catch (err) {
      console.warn(`[Startup] Warning: Could not patch manifest at ${manifestPath}:`, err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. FRONTEND READINESS PROBE
// ─────────────────────────────────────────────────────────────────────────────

function waitForFrontendReady(port, host = '127.0.0.1', timeoutMs = 12000) {
  const start = Date.now();
  return new Promise((resolve) => {
    function tryProbe() {
      if (Date.now() - start > timeoutMs || isShuttingDown || !frontendProcess) {
        return resolve(false);
      }

      const req = http.request(
        {
          hostname: host,
          port: port,
          path: '/',
          method: 'HEAD',
          timeout: 1000,
        },
        (res) => {
          res.resume();
          resolve(true);
        }
      );

      req.on('error', () => {
        setTimeout(tryProbe, 200);
      });

      req.on('timeout', () => {
        req.destroy();
        setTimeout(tryProbe, 200);
      });

      req.end();
    }

    tryProbe();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. START NEXT.JS STANDALONE SERVER (CHILD PROCESS)
// ─────────────────────────────────────────────────────────────────────────────

async function startFrontend() {
  if (isStartingFrontend || (frontendProcess && !frontendProcess.killed)) {
    console.log('[Frontend] Next.js standalone server is already running or starting.');
    return;
  }
  isStartingFrontend = true;

  if (!fs.existsSync(nextServerPath)) {
    console.error('[Frontend] ERROR: Next.js standalone build is missing.');
    console.error(`[Frontend] Expected file: ${nextServerPath}`);
    console.error('[Frontend] Run "npm run build" before starting the application.');
    isStartingFrontend = false;
    process.exit(1);
  }

  // Ensure internal port is free before spawning to prevent EADDRINUSE races
  const portFree = await waitForPortAvailable(FRONTEND_PORT, '127.0.0.1', 5000);
  if (!portFree) {
    console.error(`[Frontend] ERROR: Port 127.0.0.1:${FRONTEND_PORT} is still in use after 5s. Cannot start Next.js.`);
    isStartingFrontend = false;
    process.exit(1);
  }

  // Patch routes manifest before spawning Next.js
  patchRoutesManifest();

  console.log(`[Frontend] Starting Next.js standalone on 127.0.0.1:${FRONTEND_PORT}`);

  const child = spawn(
    process.execPath,
    [nextServerPath],
    {
      cwd: standaloneDir,
      env: {
        ...process.env,
        PORT: String(FRONTEND_PORT),
        HOSTNAME: '127.0.0.1',
        INTERNAL_BACKEND_URL,
        BACKEND_INTERNAL_URL: INTERNAL_BACKEND_URL,
        BACKEND_PORT: String(PUBLIC_PORT),
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://wonderfuljodi.com',
      },
      stdio: 'inherit',
    }
  );

  frontendProcess = child;
  isStartingFrontend = false;

  console.log(`[Frontend] Next.js started successfully with PID ${child.pid}`);

  child.on('error', (error) => {
    console.error(`[Frontend] Next.js process failed to start (PID: ${child.pid || 'unknown'}):`, error.message);
    if (frontendProcess === child) {
      frontendProcess = null;
    }
    if (!isShuttingDown) {
      handleShutdown('SIGTERM');
    }
  });

  child.on('exit', (code, signal) => {
    const pid = child.pid;
    if (frontendProcess === child) {
      frontendProcess = null;
    }

    if (isShuttingDown) {
      console.log(`[Shutdown] Next.js frontend (PID ${pid}) exited during shutdown (Code: ${code}, Signal: ${signal}).`);
    } else {
      console.error(`[Frontend] Next.js exited unexpectedly (Code: ${code}, Signal: ${signal}) on 127.0.0.1:${FRONTEND_PORT} (PID: ${pid})`);
      // Do not leave Express running in a broken half-state without frontend
      handleShutdown('SIGTERM');
    }
  });

  // Probe until Next.js is responding before Express opens to the public
  const ready = await waitForFrontendReady(FRONTEND_PORT, '127.0.0.1', 12000);
  if (ready) {
    console.log(`[Frontend] Next.js is ready and listening on 127.0.0.1:${FRONTEND_PORT}`);
  } else if (!isShuttingDown) {
    console.error(`[Frontend] ERROR: Next.js did not become ready on 127.0.0.1:${FRONTEND_PORT} within 12s. Cannot start production application.`);
    await handleShutdown('SIGTERM');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. START EXPRESS BACKEND (PUBLIC SERVER)
// ─────────────────────────────────────────────────────────────────────────────

function startBackend() {
  if (!fs.existsSync(backendDistPath)) {
    console.error('[Backend] ERROR: Compiled backend is missing.');
    console.error(`[Backend] Expected file: ${backendDistPath}`);
    console.error('[Backend] Run "npm run build" from the project root first.');
    process.exit(1);
  }

  try {
    require(backendDistPath);
    console.log(`Express backend started (listening publicly on port ${PUBLIC_PORT})`);
  } catch (err) {
    console.error('');
    console.error('[Backend] ========================================');
    console.error('[Backend] FATAL: backend/dist/server.js failed to load.');
    console.error('[Backend] ========================================');

    if (err && err.message) {
      console.error('[Backend] Error Message:', err.message);
    }
    if (err && err.code) {
      console.error('[Backend] Error Code:   ', err.code);
    }
    if (err && err.stack) {
      console.error('[Backend] Stack Trace:\n', err.stack);
    }

    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. PROCESS MONITORING & GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────────────────────────────────────

process.on('unhandledRejection', (reason) => {
  console.error(
    '[Process] Unhandled Rejection:',
    (reason && reason.message) ? reason.message : reason
  );
});

process.on('uncaughtException', (error) => {
  console.error(
    '[Process] Uncaught Exception:',
    (error && error.message) ? error.message : error
  );
  if (error && error.stack) {
    console.error(error.stack);
  }
});

async function handleShutdown(signal) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.log(`\n[Shutdown] Received ${signal}. Shutting down gracefully...`);

  const child = frontendProcess;
  frontendProcess = null;

  if (child) {
    console.log('[Shutdown] Stopping Next.js frontend...');

    await new Promise((resolve) => {
      let resolved = false;
      let forceKillTimer = null;

      const done = () => {
        if (!resolved) {
          resolved = true;
          if (forceKillTimer) {
            clearTimeout(forceKillTimer);
            forceKillTimer = null;
          }
          console.log('[Shutdown] Next.js frontend stopped.');
          resolve();
        }
      };

      // If the child has already exited, the 'exit' event was already emitted
      // and once('exit', done) will never fire. Check child.exitCode to detect this.
      if (child.exitCode !== null || child.signalCode !== null) {
        return done();
      }

      child.once('exit', done);

      // Send SIGTERM to request graceful exit
      try {
        child.kill(signal || 'SIGTERM');
      } catch (err) {
        console.warn('[Shutdown] Error sending signal to child process:', err.message);
        // Signal failed — child may have already exited between our check and kill
        done();
      }

      // If child does not exit in 5 seconds, force SIGKILL
      forceKillTimer = setTimeout(() => {
        if (!resolved) {
          console.warn(`[Shutdown] Next.js child (PID ${child.pid}) did not exit in 5s. Sending SIGKILL...`);
          try {
            child.kill('SIGKILL');
          } catch (_) {}
          // Allow 2s for SIGKILL to take effect
          setTimeout(done, 2000);
        }
      }, 5000);

      if (forceKillTimer.unref) {
        forceKillTimer.unref();
      }
    });
  } else {
    console.log('[Shutdown] No Next.js child process to stop.');
  }

  process.exit(signal === 'SIGTERM' || signal === 'SIGINT' ? 0 : 1);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// ─────────────────────────────────────────────────────────────────────────────
// 10. LAUNCH APPLICATION
//
// 1. Start Express backend publicly on PUBLIC_PORT immediately (Hostinger requirement)
// 2. Start Next.js standalone process internally on FRONTEND_PORT asynchronously
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  startBackend();

  startFrontend().catch((err) => {
    console.error('[Startup] Fatal frontend initialization error:', err);
    handleShutdown('SIGTERM');
  });
}

main();
