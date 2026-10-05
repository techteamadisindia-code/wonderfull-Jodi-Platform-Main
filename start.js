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
// 3. FILE PATHS
// ─────────────────────────────────────────────────────────────────────────────

const standaloneDir = path.join(__dirname, 'frontend', '.next', 'standalone');
const nextServerPath = path.join(standaloneDir, 'server.js');
const backendDistPath = path.join(__dirname, 'backend', 'dist', 'server.js');

// ─────────────────────────────────────────────────────────────────────────────
// 4. PATCH ROUTES MANIFEST
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
      // Replace any 127.0.0.1 or localhost with any port to the actual runtime INTERNAL_BACKEND_URL
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
// 5. START NEXT.JS STANDALONE SERVER (CHILD PROCESS)
// ─────────────────────────────────────────────────────────────────────────────

let frontendProcess = null;

function startFrontend() {
  if (!fs.existsSync(nextServerPath)) {
    console.error('[Frontend] ERROR: Next.js standalone build is missing.');
    console.error(`[Frontend] Expected file: ${nextServerPath}`);
    console.error('[Frontend] Run "npm run build" before starting the application.');
    return;
  }

  // Patch routes manifest before spawning Next.js
  patchRoutesManifest();

  frontendProcess = spawn(
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

  console.log(`Next.js frontend started (listening internally on 127.0.0.1:${FRONTEND_PORT})`);

  frontendProcess.on('error', (error) => {
    console.error('[Frontend] Next.js process failed to start:', error.message);
  });

  frontendProcess.on('exit', (code, signal) => {
    if (code !== 0 && signal !== 'SIGTERM' && signal !== 'SIGINT') {
      console.error(`[Frontend] Next.js exited unexpectedly (Code: ${code}, Signal: ${signal})`);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. START EXPRESS BACKEND (PUBLIC SERVER)
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

    console.error('');
    console.error('[Backend] Diagnostic Checklist:');
    console.error('  1. Missing dependencies — run: npm install in root and backend/');
    console.error('  2. Prisma client missing — run: npx prisma generate in backend/');
    console.error('  3. Port conflict — check if port ' + PUBLIC_PORT + ' is already bound');
    console.error('  4. Missing or invalid DATABASE_URL in backend/.env');
    console.error('  5. Backend TypeScript compile error — run: npm run build:backend');
    console.error('');

    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. PROCESS MONITORING & GRACEFUL SHUTDOWN
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

function handleShutdown(signal) {
  console.log(`\n[Shutdown] Received ${signal}. Shutting down gracefully...`);

  if (frontendProcess && !frontendProcess.killed) {
    try {
      frontendProcess.kill(signal);
      console.log('[Shutdown] Next.js frontend stopped.');
    } catch (_) {
      // Ignore shutdown kill errors
    }
  }

  process.exit(0);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// ─────────────────────────────────────────────────────────────────────────────
// 8. LAUNCH APPLICATION
//
// 1. Start Next.js standalone process internally on FRONTEND_PORT
// 2. Start Express backend publicly on PUBLIC_PORT
// ─────────────────────────────────────────────────────────────────────────────

startFrontend();
startBackend();
