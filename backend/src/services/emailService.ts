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
