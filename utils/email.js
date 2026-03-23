const SibApiV3Sdk = require('sib-api-v3-sdk')

// ─────────────────────────────────────────────────────────────────────────────
// TODO: Set this in your .env file and in Render environment variables:
//   BREVO_API_KEY=your-brevo-api-key
//   BREVO_SENDER_EMAIL=your-verified-sender@gmail.com  ← the email you signed up to Brevo with
//   BREVO_SENDER_NAME=FitAI
//   Get your API key at https://app.brevo.com → SMTP & API → API Keys
// ─────────────────────────────────────────────────────────────────────────────

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
apiInstance.authentications['apiKey'].apiKey = process.env.BREVO_API_KEY

const sender = {
  email: process.env.BREVO_SENDER_EMAIL,
  name:  process.env.BREVO_SENDER_NAME || 'FitAI',
}

exports.sendOtpEmail = async (to, otp, name) => {
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()

  sendSmtpEmail.sender  = sender
  sendSmtpEmail.to      = [{ email: to, name }]
  sendSmtpEmail.subject = 'Verify your FitAI account'
  sendSmtpEmail.htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#7c3aed;margin-bottom:8px;">Welcome to FitAI, ${name}! 💪</h2>
      <p style="color:#374151;">Use the OTP below to verify your email address. It expires in <strong>10 minutes</strong>.</p>
      <div style="text-align:center;margin:32px 0;">
        <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#1f2937;">${otp}</span>
      </div>
      <p style="color:#6b7280;font-size:13px;">If you didn't create a FitAI account, you can safely ignore this email.</p>
    </div>
  `

  await apiInstance.sendTransacEmail(sendSmtpEmail)
}

exports.sendPasswordResetEmail = async (to, otp, name) => {
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()

  sendSmtpEmail.sender  = sender
  sendSmtpEmail.to      = [{ email: to, name }]
  sendSmtpEmail.subject = 'Reset your FitAI password'
  sendSmtpEmail.htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
      <h2 style="color:#7c3aed;">Password Reset Request</h2>
      <p style="color:#374151;">Hi ${name}, use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
      <div style="text-align:center;margin:32px 0;">
        <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#1f2937;">${otp}</span>
      </div>
      <p style="color:#6b7280;font-size:13px;">If you did not request a password reset, ignore this email.</p>
    </div>
  `

  await apiInstance.sendTransacEmail(sendSmtpEmail)
}