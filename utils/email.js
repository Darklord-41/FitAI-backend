const nodemailer = require('nodemailer')

// ─────────────────────────────────────────────────────────────────────────────
// TODO: Set these in your .env file
//   EMAIL_HOST=smtp.gmail.com
//   EMAIL_PORT=587
//   EMAIL_USER=your-gmail@gmail.com
//   EMAIL_PASS=your-gmail-app-password   ← generate at https://myaccount.google.com/apppasswords
//   EMAIL_FROM="FitAI <your-gmail@gmail.com>"
// ─────────────────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
  port:   Number(process.env.EMAIL_PORT) || 587,
  secure: false, // true for port 465, false for 587 (STARTTLS)
  auth: {
    user: process.env.EMAIL_USER, // TODO: set EMAIL_USER in .env
    pass: process.env.EMAIL_PASS, // TODO: set EMAIL_PASS in .env (Gmail App Password)
  },
})

/**
 * Sends a 6-digit OTP to the user's email for verification.
 * @param {string} to      - Recipient email address
 * @param {string} otp     - Plain 6-digit OTP (do NOT store plain OTP in DB)
 * @param {string} name    - Recipient's first name
 */
exports.sendOtpEmail = async (to, otp, name) => {
  const mailOptions = {
    from:    process.env.EMAIL_FROM || `"FitAI" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Verify your FitAI account',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#7c3aed;margin-bottom:8px;">Welcome to FitAI, ${name}! 💪</h2>
        <p style="color:#374151;">Use the OTP below to verify your email address. It expires in <strong>10 minutes</strong>.</p>
        <div style="text-align:center;margin:32px 0;">
          <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#1f2937;">${otp}</span>
        </div>
        <p style="color:#6b7280;font-size:13px;">If you didn't create a FitAI account, you can safely ignore this email.</p>
      </div>
    `,
  }

  await transporter.sendMail(mailOptions)
}

/**
 * Sends a password-reset OTP email.
 */
exports.sendPasswordResetEmail = async (to, otp, name) => {
  const mailOptions = {
    from:    process.env.EMAIL_FROM || `"FitAI" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset your FitAI password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#7c3aed;">Password Reset Request</h2>
        <p style="color:#374151;">Hi ${name}, use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
        <div style="text-align:center;margin:32px 0;">
          <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#1f2937;">${otp}</span>
        </div>
        <p style="color:#6b7280;font-size:13px;">If you did not request a password reset, ignore this email.</p>
      </div>
    `,
  }

  await transporter.sendMail(mailOptions)
}
