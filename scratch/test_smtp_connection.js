const nodemailer = require(require('path').join(__dirname, '../backend/node_modules/nodemailer'));
const dotenv = require(require('path').join(__dirname, '../backend/node_modules/dotenv'));
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const config = {
  host: process.env.EMAIL_HOST || '',
  port: Number(process.env.EMAIL_PORT) || 587,
  user: process.env.EMAIL_USER || '',
  pass: process.env.EMAIL_PASS || '',
  from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@wonderfuljodi.com',
};

async function testSMTP() {
  console.log('===================================================');
  console.log('         SMTP CONFIGURATION & HEALTH CHECK         ');
  console.log('===================================================');
  console.log(`HOST: ${config.host || '(EMPTY)'}`);
  console.log(`PORT: ${config.port}`);
  console.log(`USER: ${config.user ? config.user.replace(/(?<=.{2}).(?=.*@)/g, '*') : '(EMPTY)'}`);
  console.log(`PASS: ${config.pass ? '******** (configured)' : '(EMPTY)'}`);
  console.log(`FROM: ${config.from}`);
  console.log('===================================================\n');

  if (!config.host || !config.user || !config.pass) {
    console.log('[DIAGNOSTIC RESULT] Missing Environment Variables:');
    if (!config.host) console.log(' - EMAIL_HOST is missing/empty in backend/.env');
    if (!config.user) console.log(' - EMAIL_USER is missing/empty in backend/.env');
    if (!config.pass) console.log(' - EMAIL_PASS is missing/empty in backend/.env');
    console.log('\nTo send real emails, please provide your SMTP provider credentials in backend/.env.\n');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: 15000,
  });

  try {
    console.log('Attempting SMTP handshake & authentication with ' + config.host + ':' + config.port + '...');
    await transporter.verify();
    console.log('\n[DIAGNOSTIC RESULT] SUCCESS: SMTP Connection and Authentication verified successfully!');
  } catch (err) {
    console.error('\n[DIAGNOSTIC RESULT] SMTP ERROR DETECTED:');
    console.error(`Code: ${err.code || 'UNKNOWN'}`);
    console.error(`Response Code: ${err.responseCode || 'N/A'}`);
    console.error(`Message: ${err.message}`);
  }
}

testSMTP();
