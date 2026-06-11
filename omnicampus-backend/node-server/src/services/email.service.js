/**
 * Email service powered by Nodemailer.
 *
 * Provides branded HTML emails for verification and password reset.
 */

const nodemailer = require('nodemailer');
const env = require('../config/env');

// ── Transporter (reused across calls) ───────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

// ── Shared HTML wrapper ─────────────────────────────────────────────────────
const wrapHtml = (body) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f7;">
    <tr>
      <td align="center" style="padding:40px 0;">
        <table width="560" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
          <!-- Header -->
          <tr>
            <td style="background:#4F46E5;padding:28px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">OmniCampus</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #e8e8eb;text-align:center;color:#9ca3af;font-size:12px;">
              &copy; ${new Date().getFullYear()} OmniCampus. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ── Send verification email ─────────────────────────────────────────────────
const sendVerificationEmail = async (email, name, token) => {
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;

  const html = wrapHtml(`
    <h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">Welcome, ${name}!</h2>
    <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">
      Thanks for creating an OmniCampus account. Please verify your email address to get started.
    </p>
    <a href="${verifyUrl}"
       style="display:inline-block;background:#4F46E5;color:#ffffff;font-size:15px;font-weight:600;
              text-decoration:none;padding:12px 28px;border-radius:6px;">
      Verify Email Address
    </a>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;">
      If you didn't create this account, you can safely ignore this email.
    </p>
  `);

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: 'Verify your OmniCampus account',
    html,
  });
};

// ── Send password-reset email ───────────────────────────────────────────────
const sendPasswordResetEmail = async (email, name, token) => {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;

  const html = wrapHtml(`
    <h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">Hi ${name},</h2>
    <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">
      We received a request to reset the password for your OmniCampus account.
      Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
    </p>
    <a href="${resetUrl}"
       style="display:inline-block;background:#4F46E5;color:#ffffff;font-size:15px;font-weight:600;
              text-decoration:none;padding:12px 28px;border-radius:6px;">
      Reset Password
    </a>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;">
      If you didn't request a password reset, you can safely ignore this email.
    </p>
  `);

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: 'Reset your OmniCampus password',
    html,
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
