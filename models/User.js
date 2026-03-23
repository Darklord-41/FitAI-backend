const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  avatar:   { type: String, default: null },

  // Physical stats
  age:    { type: Number, default: null },
  height: { type: Number, default: null }, // cm (metric) or inches (imperial)
  weight: { type: Number, default: null }, // kg (metric) or lbs (imperial)

  // Fitness profile
  goal:  { type: String, enum: ['Build Muscle', 'Lose Weight', 'Stay Fit', 'Endurance'], default: 'Stay Fit' },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },

  // Preferences
  units: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
  theme: { type: String, enum: ['dark', 'light'], default: 'dark' },

  // Streak tracking
  streak:          { type: Number, default: 0 },
  longestStreak:   { type: Number, default: 0 },
  lastWorkoutDate: { type: Date, default: null },

  // Email verification
  isVerified:       { type: Boolean, default: false },
  otp:              { type: String, default: null },       // hashed OTP stored in DB
  otpExpiresAt:     { type: Date, default: null },
  otpAttempts:      { type: Number, default: 0 },         // brute-force guard
}, { timestamps: true })

// ── Hash password before saving ──────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// ── Instance helpers ──────────────────────────────────────────────────────────
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

// Compare a plain OTP against the stored hash
userSchema.methods.compareOtp = function (candidate) {
  if (!this.otp) return false
  return bcrypt.compare(candidate, this.otp)
}

// Strip sensitive fields from JSON responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.password
  delete obj.otp
  delete obj.otpExpiresAt
  delete obj.otpAttempts
  return obj
}

module.exports = mongoose.model('User', userSchema)
