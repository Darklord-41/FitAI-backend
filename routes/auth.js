const router = require('express').Router()
const auth   = require('../middleware/auth')
const {
  register,
  verifyOtp,
  resendOtp,
  login,
  me,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController')

// Public routes
router.post('/register',        register)        // Step 1: create account + send OTP
router.post('/verify-otp',      verifyOtp)       // Step 2: verify OTP → get JWT
router.post('/resend-otp',      resendOtp)       // Resend OTP if expired
router.post('/login',           login)           // Email + password login
router.post('/forgot-password', forgotPassword)  // Send reset OTP
router.post('/reset-password',  resetPassword)   // Verify reset OTP + set new password

// Protected route
router.get('/me', auth, me)                      // Get current user from JWT

module.exports = router
