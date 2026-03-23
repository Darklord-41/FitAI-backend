const express = require('express')
const { spawn } = require('child_process')
const path = require('path')
const auth = require('../middleware/auth')
const WeeklyPlan = require('../models/WeeklyPlan')
const StreakEntry = require('../models/StreakEntry')
const User = require('../models/User')

const router = express.Router()

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Map JS getDay() (0=Sun) → plan index (0=Mon … 6=Sun)
const jsDayToPlanIndex = (jsDay) => (jsDay + 6) % 7

// Plan day names in order Mon→Sun
const PLAN_DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const dateKey = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// ─────────────────────────────────────────────
//  Helper: run Python model as child process
// ─────────────────────────────────────────────

function runPythonModel(userData) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../model.py')
    const cmd = process.platform === 'win32' ? 'python' : 'python3'
    const py = spawn(cmd, [scriptPath])

    let stdoutData = ''
    let stderrData = ''

    py.stdout.on('data', (chunk) => { stdoutData += chunk.toString() })
    py.stderr.on('data', (chunk) => { stderrData += chunk.toString() })

    py.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python exited with code ${code}. stderr: ${stderrData}`))
      }
      try {
        const result = JSON.parse(stdoutData.trim())
        if (!result.success) return reject(new Error(result.error || 'Unknown Python error'))
        resolve(result)
      } catch {
        reject(new Error(`Failed to parse Python output: ${stdoutData}`))
      }
    })

    py.on('error', (err) => {
      reject(new Error(`Failed to start Python: ${err.message}`))
    })

    py.stdin.write(JSON.stringify(userData))
    py.stdin.end()
  })
}

// ─────────────────────────────────────────────
//  Goal mapping
// ─────────────────────────────────────────────

const GOAL_MAP = {
  'Build Muscle': 'build_muscle',
  'Lose Weight': 'lose_fat',
  'Stay Fit': 'stay_fit',
  'Endurance': 'endurance',
}

// ─────────────────────────────────────────────
//  GET /api/fitness/plan   (protected)
//  Returns the active weekly plan + today/yesterday/tomorrow info
// ─────────────────────────────────────────────

router.get('/plan', auth, async (req, res) => {
  try {
    const plan = await WeeklyPlan.findOne({ user: req.user._id, active: true })
    if (!plan) {
      return res.json({ plan: null, today: null })
    }

    const now = new Date()
    const jsDay = now.getDay()              // 0=Sun .. 6=Sat
    const planIdx = jsDayToPlanIndex(jsDay)     // 0=Mon .. 6=Sun

    const todayPlan = plan.planData[planIdx] || null
    const yesterdayPlan = plan.planData[(planIdx + 6) % 7] || null
    const tomorrowPlan = plan.planData[(planIdx + 1) % 7] || null

    // Check if today is already completed
    const tk = todayKey()
    const todayEntry = await StreakEntry.findOne({ user: req.user._id, date: tk })

    res.json({
      plan: plan.planData,       // full 7-day plan (Mon→Sun order)
      today: {
        dayName: DAY_NAMES[jsDay],
        planIndex: planIdx,
        workout: todayPlan,
        completed: todayEntry ? todayEntry.status === 'done' : false,
      },
      yesterday: {
        dayName: DAY_NAMES[(jsDay + 6) % 7],
        workout: yesterdayPlan,
      },
      tomorrow: {
        dayName: DAY_NAMES[(jsDay + 1) % 7],
        workout: tomorrowPlan,
      },
    })
  } catch (err) {
    console.error('[FITNESS] getPlan error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
//  POST /api/fitness/complete-today   (protected)
//  Marks today's workout as done, creates StreakEntry,
//  updates current streak + longest streak
// ─────────────────────────────────────────────

router.post('/complete-today', auth, async (req, res) => {
  try {
    const tk = todayKey()

    // Check if already completed today
    const existing = await StreakEntry.findOne({ user: req.user._id, date: tk })
    if (existing && existing.status === 'done') {
      const user = await User.findById(req.user._id).select('streak longestStreak')
      return res.json({
        message: 'Already completed today!',
        streak: user.streak,
        longestStreak: user.longestStreak,
        alreadyDone: true,
      })
    }

    // Upsert today's entry
    await StreakEntry.findOneAndUpdate(
      { user: req.user._id, date: tk },
      { status: 'done', workoutId: null },
      { upsert: true, new: true }
    )

    // Recalculate streak
    const user = await User.findById(req.user._id)

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yKey = dateKey(yesterday)

    const lastDate = user.lastWorkoutDate ? dateKey(new Date(user.lastWorkoutDate)) : null

    if (lastDate !== tk) {
      // Check if yesterday had an entry (done or rest)
      const hadYesterday = await StreakEntry.findOne({
        user: req.user._id,
        date: yKey,
        status: { $in: ['done', 'intense', 'rest'] },
      })
      user.streak = hadYesterday ? user.streak + 1 : 1
    }

    // Update longest streak if new high
    if (user.streak > user.longestStreak) {
      user.longestStreak = user.streak
    }

    user.lastWorkoutDate = new Date()
    await user.save()

    res.json({
      message: 'Workout completed! 🔥',
      streak: user.streak,
      longestStreak: user.longestStreak,
    })
  } catch (err) {
    console.error('[FITNESS] completeToday error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
//  POST /api/fitness/undo-today   (protected)
//  Reverses today's completion (removes streak entry)
// ─────────────────────────────────────────────

router.post('/undo-today', auth, async (req, res) => {
  try {
    const tk = todayKey()

    // Remove today's streak entry
    const deleted = await StreakEntry.findOneAndDelete({ user: req.user._id, date: tk })
    if (!deleted) {
      return res.json({ message: 'Nothing to undo', streak: req.user.streak, longestStreak: req.user.longestStreak })
    }

    // Recalculate streak by walking backwards from yesterday
    const user = await User.findById(req.user._id)
    let newStreak = 0
    let checkDate = new Date()
    checkDate.setDate(checkDate.getDate() - 1) // start from yesterday

    while (true) {
      const dk = dateKey(checkDate)
      const entry = await StreakEntry.findOne({
        user: req.user._id,
        date: dk,
        status: { $in: ['done', 'intense', 'rest'] },
      })
      if (!entry) break
      newStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    user.streak = newStreak
    // Don't reduce longestStreak — that's an all-time high
    user.lastWorkoutDate = newStreak > 0 ? new Date(checkDate.getTime() + 86400000) : null
    await user.save()

    res.json({
      message: 'Today\'s completion undone',
      streak: user.streak,
      longestStreak: user.longestStreak,
    })
  } catch (err) {
    console.error('[FITNESS] undoToday error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
//  POST /api/fitness/recommend   (protected)
//  Regenerates the weekly plan (deactivates old one)
// ─────────────────────────────────────────────

router.post('/recommend', auth, async (req, res) => {
  try {
    const user = req.user
    if (!user.age || !user.weight || !user.height) {
      return res.status(400).json({
        success: false,
        error: 'Profile incomplete. Please set your age, weight, and height first.',
      })
    }

    const userData = {
      age: user.age,
      weight: user.weight,
      height: user.height,
      goal: GOAL_MAP[user.goal] || 'stay_fit',
      level: (user.level || 'Beginner').toLowerCase(),
    }

    const result = await runPythonModel(userData)

    // Deactivate all existing plans for this user
    await WeeklyPlan.updateMany({ user: user._id }, { active: false })

    // Create new active plan
    const plan = await WeeklyPlan.create({
      user: user._id,
      planData: result.workoutData,
      goal: user.goal,
      level: user.level,
      active: true,
    })

    console.log(`[FITNESS] Generated new plan for user ${user._id}`)

    res.json({
      success: true,
      user_stats: result.user_stats,
      plan: plan.planData,
    })
  } catch (err) {
    console.error('[FITNESS] recommend error:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─────────────────────────────────────────────
//  Exported helper for use in authController
//  (called after OTP verification)
// ─────────────────────────────────────────────

router.generatePlanForUser = async (user) => {
  try {
    if (!user.age || !user.weight || !user.height) {
      console.log('[FITNESS] Skipping plan generation — profile incomplete')
      return null
    }

    const userData = {
      age: user.age,
      weight: user.weight,
      height: user.height,
      goal: GOAL_MAP[user.goal] || 'stay_fit',
      level: (user.level || 'Beginner').toLowerCase(),
    }

    const result = await runPythonModel(userData)

    // Deactivate any existing plans
    await WeeklyPlan.updateMany({ user: user._id }, { active: false })

    const plan = await WeeklyPlan.create({
      user: user._id,
      planData: result.workoutData,
      goal: user.goal,
      level: user.level,
      active: true,
    })

    console.log(`[FITNESS] Auto-generated plan for user ${user._id} (${plan.planData.length} days)`)
    return plan
  } catch (err) {
    console.error('[FITNESS] Auto-generate error:', err.message)
    return null   // Don't block registration
  }
}

module.exports = router
