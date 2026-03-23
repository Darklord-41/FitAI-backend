const jwt      = require('jsonwebtoken')
const bcrypt   = require('bcryptjs')
const crypto   = require('crypto')
const User     = require('../models/User')
const { sendOtpEmail, sendPasswordResetEmail } = require('../utils/email')
const fitnessRoute = require('../routes/fitness')

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a signed JWT valid for 7 days */
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })

/** Generate a cryptographically random 6-digit OTP */
const generateOtp = () =>
  String(crypto.randomInt(100000, 999999)) // 6 digits, no leading-zero issue

// ─── POST /api/auth/register ──────────────────────────────────────────────────
/**
 * Registers a new user and sends an OTP to their email.
 * The account is NOT usable until the OTP is verified.
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, age, height, weight, goal, level } = req.body

    // Basic field validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Check duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing && existing.isVerified) {
      return res.status(400).json({ error: 'Email is already registered' })
    }

    // If an unverified account with this email exists, delete it and re-register
    if (existing && !existing.isVerified) {
      await User.deleteOne({ _id: existing._id })
    }

    // Generate & hash OTP
    const plainOtp  = generateOtp()
    const hashedOtp = await bcrypt.hash(plainOtp, 10)

    // Create user (unverified, otp stored hashed)
    const user = await User.create({
      name,
      email,
      password,   // hashed by the pre-save hook
      age:        age    ?? null,
      height:     height ?? null,
      weight:     weight ?? null,
      goal:       goal   ?? 'Stay Fit',
      level:      level  ?? 'Beginner',
      isVerified:   false,
      otp:          hashedOtp,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      otpAttempts:  0,
    })

    // Send OTP email
    await sendOtpEmail(email, plainOtp, name)

    res.status(201).json({
      message: 'Registration successful. Check your email for the 6-digit OTP to verify your account.',
      userId: user._id, // frontend uses this to POST /verify-otp
    })
  } catch (err) {
    console.error('register error:', err)
    res.status(500).json({ error: err.message })
  }
}

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────
/**
 * Verifies the OTP sent during registration.
 * On success returns a JWT so the user is immediately logged in.
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body
    if (!userId || !otp) {
      return res.status(400).json({ error: 'userId and otp are required' })
    }

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.isVerified) return res.status(400).json({ error: 'Account is already verified' })

    // Rate-limit OTP attempts (max 5)
    if (user.otpAttempts >= 5) {
      await User.deleteOne({ _id: userId }) // delete unverified account to allow fresh registration
      return res.status(429).json({ error: 'Too many failed attempts. Please register again.' })
    }

    // Check expiry
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'OTP has expired. Please register again.' })
    }

    // Compare OTP
    const isMatch = await user.compareOtp(otp)
    if (!isMatch) {
      await User.findByIdAndUpdate(userId, { $inc: { otpAttempts: 1 } })
      return res.status(400).json({ error: 'Invalid OTP' })
    }

    // Mark verified, clear OTP fields
    user.isVerified   = true
    user.otp          = null
    user.otpExpiresAt = null
    user.otpAttempts  = 0
    await user.save()

    // Auto-generate personalised workout plan (non-blocking)
    fitnessRoute.generatePlanForUser(user).catch(() => {})

    const token = signToken(user._id)
    res.json({
      message: 'Email verified successfully!',
      token,
      user,   // toJSON() strips password/otp automatically
    })
  } catch (err) {
    console.error('verifyOtp error:', err)
    res.status(500).json({ error: err.message })
  }
}

// ─── POST /api/auth/resend-otp ────────────────────────────────────────────────
/** Resends OTP for an unverified user (rate-limited by expiry window) */
exports.resendOtp = async (req, res) => {
  try {
    const { userId } = req.body
    const user = await User.findById(userId)
    if (!user)             return res.status(404).json({ error: 'User not found' })
    if (user.isVerified)   return res.status(400).json({ error: 'Account already verified' })

    const plainOtp  = generateOtp()
    const hashedOtp = await bcrypt.hash(plainOtp, 10)

    user.otp          = hashedOtp
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000)
    user.otpAttempts  = 0
    await user.save()

    await sendOtpEmail(user.email, plainOtp, user.name)
    res.json({ message: 'A new OTP has been sent to your email.' })
  } catch (err) {
    console.error('resendOtp error:', err)
    res.status(500).json({ error: err.message })
  }
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    if (!user.isVerified) {
      return res.status(403).json({
        error: 'Email not verified. Please check your inbox for the OTP.',
        userId: user._id,
      })
    }

    const token = signToken(user._id)
    res.json({ token, user })
  } catch (err) {
    console.error('login error:', err)
    res.status(500).json({ error: err.message })
  }
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
/** Returns the currently authenticated user (populated from the auth middleware) */
exports.me = async (req, res) => {
  // req.user is set by the auth middleware — always fresh from DB, no stale data
  res.json({ user: req.user })
}

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
/** Sends a password-reset OTP to the user's email */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })

    const user = await User.findOne({ email: email.toLowerCase() })
    // Always return 200 to avoid user enumeration
    if (!user || !user.isVerified) {
      return res.json({ message: 'If that email exists, you will receive a reset OTP shortly.' })
    }

    const plainOtp  = generateOtp()
    const hashedOtp = await bcrypt.hash(plainOtp, 10)

    user.otp          = hashedOtp
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000)
    user.otpAttempts  = 0
    await user.save()

    await sendPasswordResetEmail(email, plainOtp, user.name)
    res.json({
      message: 'If that email exists, you will receive a reset OTP shortly.',
      userId: user._id,
    })
  } catch (err) {
    console.error('forgotPassword error:', err)
    res.status(500).json({ error: err.message })
  }
}

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
/** Validates the OTP and sets a new password */
exports.resetPassword = async (req, res) => {
  try {
    const { userId, otp, newPassword } = req.body
    if (!userId || !otp || !newPassword) {
      return res.status(400).json({ error: 'userId, otp and newPassword are required' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (user.otpAttempts >= 5) {
      return res.status(429).json({ error: 'Too many attempts. Request a new OTP.' })
    }
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'OTP has expired. Request a new one.' })
    }

    const isMatch = await user.compareOtp(otp)
    if (!isMatch) {
      await User.findByIdAndUpdate(userId, { $inc: { otpAttempts: 1 } })
      return res.status(400).json({ error: 'Invalid OTP' })
    }

    // Set new password (pre-save hook will hash it)
    user.password     = newPassword
    user.otp          = null
    user.otpExpiresAt = null
    user.otpAttempts  = 0
    await user.save()

    res.json({ message: 'Password reset successfully. You can now log in.' })
  } catch (err) {
    console.error('resetPassword error:', err)
    res.status(500).json({ error: err.message })
  }
}
