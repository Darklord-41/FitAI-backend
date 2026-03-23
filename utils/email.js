const { Resend } = require('resend')

// ─────────────────────────────────────────────────────────────────────────────
// TODO: Set this in your .env file and in Render environment variables:
//   RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
//   Get your API key at https://resend.com → API Keys → Create Key
// ─────────────────────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY)

// NOTE: Until you verify a custom domain on Resend, you must use:
//   from: 'onboarding@resend.dev'
// After verifying your domain (e.g. fitai.com), change it to:
//   from: 'FitAI <noreply@yourdomain.com>'

exports.sendOtpEmail = async (to, otp, name) => {
  await resend.emails.send({
    from:    'FitAI <onboarding@resend.dev>',
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
  })
}

exports.sendPasswordResetEmail = async (to, otp, name) => {
  await resend.emails.send({
    from:    'FitAI <onboarding@resend.dev>',
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
  })
}