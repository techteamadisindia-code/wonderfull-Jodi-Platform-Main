import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}

export function getEmailConfig() {
  return {
    host: process.env.EMAIL_HOST || process.env.MAIL_HOST || '',
    port: Number(process.env.EMAIL_PORT || process.env.MAIL_PORT) || 587,
    user: process.env.EMAIL_USER || process.env.MAIL_USERNAME || '',
    pass: process.env.EMAIL_PASS || process.env.MAIL_PASSWORD || '',
    from:
      process.env.EMAIL_FROM ||
      process.env.MAIL_FROM ||
      process.env.EMAIL_USER ||
      process.env.MAIL_USERNAME ||
      'no-reply@wonderfuljodi.com',
  };
}

export async function verifyEmailTransporter(): Promise<{ success: boolean; message: string; code?: string }> {
  const config = getEmailConfig();
  if (!config.host || !config.user || !config.pass) {
    return {
      success: false,
      message: 'SMTP credentials (EMAIL_HOST, EMAIL_USER, EMAIL_PASS) are not configured in backend/.env.',
      code: 'ENV_CONFIG_MISSING',
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 10000,
    });

    await transporter.verify();
    return {
      success: true,
      message: `SMTP connection and authentication verified successfully with ${config.host}:${config.port}`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `SMTP verification failed: ${err.message}`,
      code: err.code || 'ECONNECTION',
    };
  }
}

export async function sendMail(emailOptions: EmailOptions) {
  const config = getEmailConfig();

  if (!config.host || !config.user || !config.pass) {
    console.log('\n--- EMAIL DISPATCH STATUS ---');
    console.log('Forgot password request received');
    console.log('Email provider: NOT_CONFIGURED (EMAIL_HOST, EMAIL_USER, or EMAIL_PASS is empty in backend/.env)');
    console.log('SMTP: not connected');
    console.log('Email send result: mocked to console');
    console.log(`Recipient: ${emailOptions.to}`);
    console.log(`Subject: ${emailOptions.subject}`);
    console.log('-----------------------------\n');
    return { messageId: `mock-${Date.now()}` };
  }

  try {
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

    const info = await transporter.sendMail({
      from: emailOptions.from || `"Wonderful Jodi Matrimony" <${config.from}>`,
      to: emailOptions.to,
      subject: emailOptions.subject,
      text: emailOptions.text,
      html: emailOptions.html,
    });

    console.log('\n--- EMAIL DISPATCH STATUS ---');
    console.log('Forgot password request received');
    console.log(`Email provider: configured (SMTP ${config.host}:${config.port})`);
    console.log('SMTP: connected');
    console.log('Email send result: success');
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Recipient: ${emailOptions.to}`);
    console.log('-----------------------------\n');

    return info;
  } catch (err: any) {
    console.error('\n--- EMAIL DISPATCH ERROR ---');
    console.error('Forgot password request received');
    console.error(`Email provider: SMTP (${config.host}:${config.port})`);
    console.error(`SMTP error code: ${err.code || 'UNKNOWN'}`);
    console.error(`SMTP error message: ${err.message}`);
    console.error('----------------------------\n');
    throw err;
  }
}

export async function sendPasswordResetEmail(to: string, fullName: string, resetUrl: string) {
  const subject = 'Reset Your Wonderful Jodi Password';
  const greeting = fullName ? `Hello ${fullName},` : 'Hello,';

  const textContent = `
${greeting}

We received a request to reset your Wonderful Jodi account password.

Click the link below to create a new password:
${resetUrl}

The link will expire after 30 minutes and can only be used once.

If you did not request a password reset, you can safely ignore this email.

Best regards,
Wonderful Jodi Team
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Wonderful Jodi Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFF9F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FFF9F5; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #FFE4E8; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);" cellspacing="0" cellpadding="0" border="0">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #101828 0%, #1E293B 100%); padding: 32px 30px; text-align: center;">
              <table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background-color: #E51F3E; width: 36px; height: 36px; border-radius: 10px; text-align: center; vertical-align: middle; color: #FFFFFF; font-size: 18px; font-weight: bold;">
                    ❤
                  </td>
                  <td style="padding-left: 12px; font-size: 22px; font-weight: bold; color: #FFFFFF; font-family: Georgia, serif; letter-spacing: -0.5px;">
                    Wonderful <span style="color: #E51F3E;">Jodi</span>
                  </td>
                </tr>
              </table>
              <p style="margin: 8px 0 0 0; color: #94A3B8; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                Premium Matrimony Platform
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 40px 36px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #0F172A; font-weight: 700; font-family: Georgia, serif;">
                ${greeting}
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                We received a request to reset your Wonderful Jodi account password. Click the button below to create a new password:
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 30px auto;">
                <tr>
                  <td align="center" style="border-radius: 12px; background: linear-gradient(135deg, #E51F3E 0%, #CE102F 100%); box-shadow: 0 4px 14px rgba(229, 31, 62, 0.35);">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 15px 36px; font-size: 15px; font-weight: bold; color: #FFFFFF; text-decoration: none; border-radius: 12px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 12px 0; font-size: 13.5px; line-height: 1.5; color: #64748B;">
                Or copy and paste this secure link directly into your browser:
              </p>
              <p style="margin: 0 0 24px 0; word-break: break-all; font-size: 12px; color: #E51F3E; background-color: #FFF1F3; padding: 12px; border-radius: 8px; border: 1px solid #FFE4E8;">
                <a href="${resetUrl}" style="color: #E51F3E; text-decoration: none;">${resetUrl}</a>
              </p>

              <div style="background-color: #F8FAFC; border-left: 3px solid #E51F3E; padding: 12px 16px; border-radius: 4px; margin: 28px 0 24px 0;">
                <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
                  <strong>Note:</strong> The link will expire after <strong>30 minutes</strong> and can only be used once.
                </p>
              </div>

              <p style="margin: 0 0 8px 0; font-size: 13.5px; line-height: 1.5; color: #64748B;">
                If you did not request a password reset, you can safely ignore this email. Your current password remains secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #F1F5F9; padding: 24px 36px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold; color: #334155;">
                Wonderful Jodi Team
              </p>
              <p style="margin: 0; font-size: 12px; color: #94A3B8;">
                © ${new Date().getFullYear()} Wonderful Jodi Matrimonial Platform. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  return sendMail({
    to,
    subject,
    text: textContent,
    html: htmlContent,
  });
}

/**
 * Send admin-specific password reset email with admin branding.
 * Subject: Reset Your Wonderful Jodi Admin Password
 */
export async function sendAdminPasswordResetEmail(to: string, fullName: string, resetUrl: string) {
  const subject = 'Reset Your Wonderful Jodi Admin Password';
  const greeting = fullName ? `Hello ${fullName},` : 'Hello,';

  const textContent = `
${greeting}

We received a request to reset the password for your Wonderful Jodi Admin account.

Click the link below to create a new password:
${resetUrl}

This link is valid for 15 minutes and can only be used once.

If you did not request this password reset, you can safely ignore this email. Your current password remains secure.

Wonderful Jodi Admin Team
`.trim();

  const year = new Date().getFullYear();
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Wonderful Jodi Admin Password</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0F1C;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0A0F1C;padding:40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:580px;background-color:#0F172A;border-radius:20px;border:1px solid #1E293B;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.5);" cellspacing="0" cellpadding="0" border="0">

          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#101828 0%,#1B2A45 100%);padding:32px 30px;text-align:center;border-bottom:1px solid #1E293B;">
              <table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background-color:#E51F3E;width:36px;height:36px;border-radius:10px;text-align:center;vertical-align:middle;color:#FFFFFF;font-size:18px;font-weight:bold;">❤</td>
                  <td style="padding-left:12px;font-size:22px;font-weight:bold;color:#FFFFFF;font-family:Georgia,serif;letter-spacing:-0.5px;">
                    Wonderful <span style="color:#E51F3E;">Jodi</span>
                  </td>
                </tr>
              </table>
              <p style="margin:10px 0 0 0;color:#64748B;font-size:11px;text-transform:uppercase;letter-spacing:2px;font-weight:700;">Administrator Password Recovery</p>
              <div style="display:inline-block;margin-top:10px;padding:5px 14px;background-color:#1E293B;border:1px solid #334155;border-radius:20px;">
                <span style="color:#F59E0B;font-size:11px;font-weight:700;">🔐 ADMIN PORTAL</span>
              </div>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:36px 36px 28px 36px;">
              <h2 style="margin:0 0 8px 0;font-size:22px;color:#F1F5F9;font-weight:700;font-family:Georgia,serif;">
                ${greeting}
              </h2>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.7;color:#94A3B8;">
                We received a request to reset the password for your <strong style="color:#E2E8F0;">Wonderful Jodi Admin</strong> account.
                Click the button below to create a new password.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px auto;">
                <tr>
                  <td align="center" style="border-radius:12px;background:linear-gradient(135deg,#E51F3E 0%,#CE102F 100%);box-shadow:0 4px 20px rgba(229,31,62,0.4);">
                    <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:16px 40px;font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:12px;letter-spacing:0.3px;">
                      Reset Admin Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback URL -->
              <p style="margin:20px 0 8px 0;font-size:13px;color:#64748B;line-height:1.5;">
                Or copy and paste this secure link into your browser:
              </p>
              <div style="background-color:#1E293B;border:1px solid #334155;border-radius:8px;padding:12px 16px;word-break:break-all;">
                <a href="${resetUrl}" style="color:#E51F3E;font-size:12px;text-decoration:none;">${resetUrl}</a>
              </div>

              <!-- Expiry Warning -->
              <div style="background-color:#1A1A2E;border-left:3px solid #F59E0B;padding:14px 16px;border-radius:4px;margin:24px 0;">
                <p style="margin:0;font-size:13px;color:#CBD5E1;line-height:1.6;">
                  ⚠️ <strong>This link is valid for 15 minutes and can only be used once.</strong>
                  For your security, the link will expire and cannot be reused.
                </p>
              </div>

              <p style="margin:0;font-size:13px;line-height:1.6;color:#64748B;">
                If you did not request this password reset, please ignore this email.
                Your current password remains unchanged and your account is secure.
              </p>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td style="background-color:#0A0F1C;border-top:1px solid #1E293B;padding:20px 36px;">
              <p style="margin:0 0 4px 0;font-size:12px;color:#475569;text-align:center;">
                🔒 All admin password reset requests are logged and audited for security.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#070C16;border-top:1px solid #1E293B;padding:20px 36px;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#94A3B8;">Wonderful Jodi Admin Team</p>
              <p style="margin:0;font-size:11px;color:#334155;">
                © ${year} Wonderful Jodi Matrimonial Platform. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return sendMail({
    to,
    subject,
    text: textContent,
    html: htmlContent,
  });
}
