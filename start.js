/**
 * Wonderful Jodi â€” Production Server for Hostinger
 *
 * Unified Single-Port Architecture:
 * - Express backend API, uploads, and Socket.IO
 * - Next.js in-process SSR and static asset handling
 * - Single listener on process.env.PORT || 3000 on HOST 0.0.0.0
 *
 * Hostinger Startup File: app.js / start.js
 */

'use strict';

const path = require('path');
const fs = require('fs');

const initialPort = process.env.PORT;
const isStagingMode = process.env.NODE_ENV === 'staging' || process.env.STAGING_MODE === 'true';

if (isStagingMode) {
  process.env.NODE_ENV = 'staging';
  const stagingEnvPath = path.join(__dirname, 'backend', '.env.staging');
  if (fs.existsSync(stagingEnvPath)) {
    try {
      require('dotenv').config({ path: stagingEnvPath });
    } catch (e) {
      // dotenv optional
    }
  }
} else {
  // Load environment variables if backend/.env or root .env is present (for local testing / Hostinger production)
  const envCandidates = [
    path.join(__dirname, 'backend', '.env'),
    path.join(__dirname, '.env'),
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      try {
        require('dotenv').config({ path: envPath, override: false });
      } catch (e) {
        // dotenv optional
      }
    }
  }
}

if (!isStagingMode) {
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
}
// Default to 3000 for unified architecture unless explicitly provided
const PORT = parseInt(initialPort || (process.env.PORT === '5000' ? '3000' : process.env.PORT) || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

process.env.PORT = String(PORT);
process.env.HOST = HOST;

console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
console.log('  WONDERFUL JODI â€” Unified Production Server');
console.log(`  Public Port: ${PORT}`);
console.log(`  Host:        ${HOST}`);
console.log(`  Node Env:    ${process.env.NODE_ENV}`);
console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');

const backendDistPath = path.join(__dirname, 'backend', 'dist', 'server.js');

if (!fs.existsSync(backendDistPath)) {
  console.error('[Startup] ERROR: Compiled backend is missing.');
  console.error(`[Startup] Expected file: ${backendDistPath}`);
  console.error('[Startup] Please run "npm run build" first.');
  process.exit(1);
}

// Start unified server (Express + Next.js in-process)
require(backendDistPath);
