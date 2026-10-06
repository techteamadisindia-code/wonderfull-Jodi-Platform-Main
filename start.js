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

process.env.NODE_ENV = process.env.NODE_ENV || 'production';
const PORT = parseInt(process.env.PORT, 10) || 3000;
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
