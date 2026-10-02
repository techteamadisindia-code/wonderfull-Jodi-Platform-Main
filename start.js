/**
 * Wonderful Jodi — Production Server for Hostinger
 *
 * Architecture:
 * Browser
 *   ↓
 * Hostinger public PORT
 *   ↓
 * Express Backend
 *   ├── /api/*       → Backend API
 *   ├── /uploads/*   → Uploaded files
 *   └── everything else → Next.js standalone
 *
 * Hostinger Startup File: start.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PUBLIC_PORT = parseInt(process.env.PORT, 10) || 3000;

// If Hostinger gives us port 3000, use 3001 for Next.js.
// Otherwise use 3000 internally.
const FRONTEND_PORT =
  parseInt(process.env.FRONTEND_PORT, 10) ||
  (PUBLIC_PORT === 3000 ? 3001 : 3000);

process.env.PORT = String(PUBLIC_PORT);
process.env.FRONTEND_PORT = String(FRONTEND_PORT);

console.log('==================================================');
console.log('   WONDERFUL JODI - PRODUCTION SERVER');
console.log('==================================================');
console.log(`Public Port:   ${PUBLIC_PORT}`);
console.log(`Frontend Port: ${FRONTEND_PORT}`);
console.log('==================================================');

let frontendProcess = null;

const standaloneDir = path.join(
  __dirname,
  'frontend',
  '.next',
  'standalone'
);

const nextServerPath = path.join(
  standaloneDir,
  'server.js'
);

/**
 * Start Next.js standalone server
 */
function launchNextServer() {

  if (!fs.existsSync(nextServerPath)) {
    console.error(
      '[Frontend] ERROR: Next.js standalone server not found:'
    );

    console.error(nextServerPath);

    return;
  }

  console.log(
    `[Frontend] Starting Next.js on internal port ${FRONTEND_PORT}...`
  );

  frontendProcess = spawn(
    process.execPath,
    [nextServerPath],
    {
      cwd: standaloneDir,

      env: {
        ...process.env,

        PORT: String(FRONTEND_PORT),

        HOSTNAME: '127.0.0.1',

        // Internal Express backend location for Next.js server-side proxy
        INTERNAL_BACKEND_URL: `http://127.0.0.1:${PUBLIC_PORT}`,
        BACKEND_PORT: String(PUBLIC_PORT),

        NEXT_PUBLIC_APP_URL:
          process.env.NEXT_PUBLIC_APP_URL ||
          'https://wonderfuljodi.com',
      },

      stdio: 'inherit',
    }
  );

  frontendProcess.on('error', (error) => {

    console.error(
      '[Frontend] Failed to start:',
      error.message
    );

  });

  frontendProcess.on('exit', (code, signal) => {

    console.warn(
      `[Frontend] Next.js exited. Code: ${code}, Signal: ${signal}`
    );

  });
}

/**
 * Start frontend
 *
 * We expect Hostinger build process to create
 * frontend/.next/standalone/server.js.
 *
 * We do NOT build automatically during startup.
 */
function startFrontend() {

  if (!fs.existsSync(nextServerPath)) {

    console.error(
      '[Frontend] ERROR: Standalone build is missing.'
    );

    console.error(
      '[Frontend] Expected:'
    );

    console.error(nextServerPath);

    console.error(
      '[Frontend] Run "npm run build" before starting the application.'
    );

    return;
  }

  launchNextServer();
}

/**
 * 1. Start Next.js
 */
startFrontend();

/**
 * 2. Start Express backend
 */
console.log(
  `\n[Backend] Starting Express API on port ${PUBLIC_PORT}...`
);

require('./backend/dist/server.js');

/**
 * 3. Graceful shutdown
 */
function handleShutdown(signal) {

  console.log(
    `\nReceived ${signal}. Shutting down...`
  );

  if (
    frontendProcess &&
    !frontendProcess.killed
  ) {

    try {
      frontendProcess.kill(signal);
    } catch (error) {
      // Ignore shutdown errors
    }

  }

  process.exit(0);
}

process.on(
  'SIGTERM',
  () => handleShutdown('SIGTERM')
);

process.on(
  'SIGINT',
  () => handleShutdown('SIGINT')
);

process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled Rejection:', (reason && reason.message) || reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Process] Uncaught Exception:', (error && error.message) || error);
});

