const path = require('path')
const fs   = require('fs')
const User = require('../models/User')
const fitnessRoute = require('../routes/fitness')

// ─── POST /api/user/avatar ────────────────────────────────────────────────────
/** Handles avatar file upload (multer file is on req.file) */
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Build the public URL path
    const avatarUrl = `/uploads/avatars/${req.file.filename}`

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarUrl },
      { new: true }
    )

    res.json({ user, avatarUrl })
  } catch (err) {
    console.error('uploadAvatar error:', err)
    res.status(500).json({ error: err.message })
  }
}

// ─── GET /api/user/profile ────────────────────────────────────────────────────
/** Returns the fully populated profile of the authenticated user */
exports.getProfile = async (req, res) => {
  // req.user is always fetched fresh from DB by the auth middleware
  res.json({ user: req.user })
}

// ─── PUT /api/user/profile ────────────────────────────────────────────────────
/** Updates mutable profile fields; only updates fields that are actually sent.
 *  If fitness-relevant data changes (weight, height, age, goal, level),
 *  automatically regenerates the weekly plan. */
exports.updateProfile = async (req, res) => {
  try {
    const allowed = ['name', 'age', 'height', 'weight', 'goal', 'level', 'avatar']
    const updates = {}

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key]
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' })
    }

    // Detect if fitness-relevant data changed
    const fitnessFields = ['weight', 'height', 'age', 'goal', 'level']
    const fitnessChanged = fitnessFields.some(f =>
      updates[f] !== undefined && updates[f] !== req.user[f]
    )

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    )

    // Auto-regenerate plan if fitness data changed
    if (fitnessChanged) {
      fitnessRoute.generatePlanForUser(user).catch(() => {})
    }

    res.json({ user, planRegenerated: fitnessChanged })
  } catch (err) {
    console.error('updateProfile error:', err)
    res.status(500).json({ error: err.message })
  }
}

// ─── PUT /api/user/settings ───────────────────────────────────────────────────
/** Updates units (metric/imperial) and theme (dark/light) preferences */
exports.updateSettings = async (req, res) => {
  try {
    const { units, theme } = req.body
    const updates = {}

    if (units !== undefined) {
      if (!['metric', 'imperial'].includes(units)) {
        return res.status(400).json({ error: "units must be 'metric' or 'imperial'" })
      }
      updates.units = units
    }

    if (theme !== undefined) {
      if (!['dark', 'light'].includes(theme)) {
        return res.status(400).json({ error: "theme must be 'dark' or 'light'" })
      }
      updates.theme = theme
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid settings provided' })
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    )

    res.json({ user })
  } catch (err) {
    console.error('updateSettings error:', err)
    res.status(500).json({ error: err.message })
  }
}

// ─── PUT /api/user/password ───────────────────────────────────────────────────
/** Changes password after verifying the current one */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' })
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must differ from the current password' })
    }

    // Fetch user WITH password (select('-password') is used in middleware, so re-fetch here)
    const user = await User.findById(req.user._id).select('+password')
    const valid = await user.comparePassword(currentPassword)
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' })
    }

    // pre-save hook will hash the new password
    user.password = newPassword
    await user.save()

    res.json({ message: 'Password updated successfully' })
  } catch (err) {
    console.error('changePassword error:', err)
    res.status(500).json({ error: err.message })
  }
}

// ─── DELETE /api/user/account ─────────────────────────────────────────────────
/** Permanently deletes the user's account and all associated data */
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body
    if (!password) {
      return res.status(400).json({ error: 'Please confirm your password to delete the account' })
    }

    const user = await User.findById(req.user._id).select('+password')
    const valid = await user.comparePassword(password)
    if (!valid) {
      return res.status(400).json({ error: 'Incorrect password' })
    }

    // Delete the user and their workouts/streak entries/plans
    const Workout     = require('../models/Workout')
    const StreakEntry = require('../models/StreakEntry')
    const WeeklyPlan = require('../models/WeeklyPlan')

    await Promise.all([
      User.findByIdAndDelete(req.user._id),
      Workout.deleteMany({ user: req.user._id }),
      StreakEntry.deleteMany({ user: req.user._id }),
      WeeklyPlan.deleteMany({ user: req.user._id }),
    ])

    res.json({ message: 'Account and all associated data deleted successfully' })
  } catch (err) {
    console.error('deleteAccount error:', err)
    res.status(500).json({ error: err.message })
  }
}
