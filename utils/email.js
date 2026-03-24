const { google } = require('googleapis');

/**
 * Sends email using Gmail REST API (no SMTP - works on Render)
 */
const sendEmail = async (to, subject, html) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Construct raw email in RFC 2822 format
    const emailLines = [
      `From: "FitAI" <${process.env.GMAIL_USER}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      html
    ];

    const rawEmail = emailLines.join('\n');

    // Base64 encode (URL-safe)
    const encodedEmail = Buffer.from(rawEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });

    console.log('Email sent, message ID:', result.data.id);
    return result;

  } catch (error) {
    console.error('Email sending failed:', error.message);
    throw error;
  }
};

/**
 * Sends a 6-digit OTP to the user's email for verification.
 * @param {string} to      - Recipient email address
 * @param {string} otp     - Plain 6-digit OTP (do NOT store plain OTP in DB)
 * @param {string} name    - Recipient's first name
 */
exports.sendOtpEmail = async (to, otp, name) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#7c3aed;margin-bottom:8px;">Welcome to FitAI, ${name}! 💪</h2>
      <p style="color:#374151;">Use the OTP below to verify your email address. It expires in <strong>10 minutes</strong>.</p>
      <div style="text-align:center;margin:32px 0;">
        <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#1f2937;">${otp}</span>
      </div>
      <p style="color:#6b7280;font-size:13px;">If you didn't create a FitAI account, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail(to, 'Verify your FitAI account', html);
};

/**
 * Sends a password-reset OTP email.
 */
exports.sendPasswordResetEmail = async (to, otp, name) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#7c3aed;">Password Reset Request</h2>
      <p style="color:#374151;">Hi ${name}, use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
      <div style="text-align:center;margin:32px 0;">
        <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#1f2937;">${otp}</span>
      </div>
      <p style="color:#6b7280;font-size:13px;">If you did not request a password reset, ignore this email.</p>
    </div>
  `;

  await sendEmail(to, 'Reset your FitAI password', html);
};