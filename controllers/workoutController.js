const Workout = require('../models/Workout')
const User = require('../models/User')
const StreakEntry = require('../models/StreakEntry')

// ─── Helper: today's date key in YYYY-MM-DD (UTC) ────────────────────────────
const todayKey = () => {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

const dateKey = (date) => {
  const d = new Date(date)
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

// ─── GET /api/workouts ────────────────────────────────────────────────────────
/** Returns the authenticated user's workouts, newest first */
exports.getWorkouts = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100)
    const page = Math.max(parseInt(req.query.page) || 1, 1)
    const skip = (page - 1) * limit

    const [workouts, total] = await Promise.all([
      Workout.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Workout.countDocuments({ user: req.user._id }),
    ])

    res.json({ workouts, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('getWorkouts error:', err)
    res.status(500).json({ error: err.message })
  }
}

// ─── GET /api/workouts/:id ────────────────────────────────────────────────────
exports.getWorkoutById = async (req, res) => {
  try {
    const workout = await Workout.findOne({ _id: req.params.id, user: req.user._id })
    if (!workout) return res.status(404).json({ error: 'Workout not found' })
    res.json({ workout })
  } catch (err) {
    console.error('getWorkoutById error:', err)
    res.status(500).json({ error: err.message })
  }
}

// ─── POST /api/workouts ───────────────────────────────────────────────────────
/** Creates a new workout for the authenticated user */
exports.createWorkout = async (req, res) => {
  try {
    const { title, category, level, durationMinutes, exercises, notes } = req.body

    if (!title) return res.status(400).json({ error: 'Workout title is required' })

    const workout = await Workout.create({
      user: req.user._id,
      title,
      category: category ?? null,
      level: level ?? req.user.level, // default to user's fitness level
      durationMinutes: durationMinutes ?? null,
      exercises: exercises ?? [],
      notes: notes ?? '',
    })

    res.status(201).json({ workout })
  } catch (err) {
    console.error('createWorkout error:', err)
    res.status(500).json({ error: err.message })
  }
}

// ─── PUT /api/workouts/:id ────────────────────────────────────────────────────
/** Updates an existing (non-completed) workout */
exports.updateWorkout = async (req, res) => {
  try {
    const workout = await Workout.findOne({ _id: req.params.id, user: req.user._id })
    if (!workout) return res.status(404).json({ error: 'Workout not found' })
    if (workout.completedAt) {
      return res.status(400).json({ error: 'Cannot edit a completed workout' })
    }

    const allowed = ['title', 'category', 'level', 'durationMinutes', 'exercises', 'notes']
    for (const key of allowed) {
      if (req.body[key] !== undefined) workout[key] = req.body[key]
    }
    await workout.save() // triggers totalVolume pre-save hook

    res.json({ workout })
  } catch (err) {
    console.error('updateWorkout error:', err)
    res.status(500).json({ error: err.message })
  }
}

// ─── PUT /api/workouts/:id/complete ──────────────────────────────────────────
/**
 * Marks a workout as completed, records a streak entry for today,
 * and recalculates the user's current streak.
 *
 * Streak rules:
 *   - A streak increments if the user also worked out yesterday.
 *   - If yesterday has no entry (or was 'missed'), the streak resets to 1.
 *   - Completing the same day twice does NOT double-increment.
 */
exports.completeWorkout = async (req, res) => {
  try {
    const workout = await Workout.findOne({ _id: req.params.id, user: req.user._id })
    if (!workout) return res.status(404).json({ error: 'Workout not found' })
    if (workout.completedAt) {
      return res.status(400).json({ error: 'Workout already completed' })
    }

    // 1. Mark workout done
    workout.completedAt = new Date()
    // Update totalVolume from final exercise data
    await workout.save()

    // 2. Upsert today's streak entry
    const today = todayKey()
    const existingEntry = await StreakEntry.findOne({ user: req.user._id, date: today })

    if (!existingEntry) {
      await StreakEntry.create({
        user: req.user._id,
        date: today,
        status: 'done',
        workoutId: workout._id,
      })

      // 3. Recalculate streak only when it's the first workout of the day
      const user = await User.findById(req.user._id)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yKey = dateKey(yesterday)

      const hadYesterday = await StreakEntry.findOne({
        user: req.user._id,
        date: yKey,
        status: { $ne: 'missed' }, // 'done', 'intense', or 'rest' all count
      })

      // Also handle edge case: if user's lastWorkoutDate was today (shouldn't happen
      // since completedAt was null, but just in case), keep streak as-is
      const lastDate = user.lastWorkoutDate
        ? dateKey(new Date(user.lastWorkoutDate))
        : null

      if (lastDate === today) {
        // Already counted today — don't increment again
      } else {
        user.streak = hadYesterday ? user.streak + 1 : 1
      }

      // Update longest streak if new high
      if (user.streak > user.longestStreak) {
        user.longestStreak = user.streak
      }

      user.lastWorkoutDate = new Date()
      await user.save()

      res.json({ workout, streak: user.streak, longestStreak: user.longestStreak })
    } else {
      // Workout completed but a streak entry already exists for today (e.g. rest day marked)
      // Update the entry to reference this workout
      existingEntry.status = 'done'
      existingEntry.workoutId = workout._id
      await existingEntry.save()

      const user = await User.findById(req.user._id)
      res.json({ workout, streak: user.streak })
    }
  } catch (err) {
    console.error('completeWorkout error:', err)
    res.status(500).json({ error: err.message })
  }
}

// ─── DELETE /api/workouts/:id ─────────────────────────────────────────────────
exports.deleteWorkout = async (req, res) => {
  try {
    const workout = await Workout.findOneAndDelete({ _id: req.params.id, user: req.user._id })
    if (!workout) return res.status(404).json({ error: 'Workout not found' })
    res.json({ message: 'Workout deleted' })
  } catch (err) {
    console.error('deleteWorkout error:', err)
    res.status(500).json({ error: err.message })
  }
}

// ─── GET /api/workouts/streak ─────────────────────────────────────────────────
/** Returns last 90 days of streak calendar data + current streak count */
exports.getStreakData = async (req, res) => {
  try {
    const entries = await StreakEntry.find({ user: req.user._id })
      .sort({ date: -1 })

    const user = await User.findById(req.user._id).select('streak longestStreak lastWorkoutDate')

    res.json({
      entries,
      currentStreak: user.streak,
      longestStreak: user.longestStreak,
      lastWorkoutDate: user.lastWorkoutDate,
    })
  } catch (err) {
    console.error('getStreakData error:', err)
    res.status(500).json({ error: err.message })
  }
}

// ─── POST /api/workouts/streak/mark-rest ─────────────────────────────────────
/** Marks today as a rest day (doesn't break streak) */
exports.markRestDay = async (req, res) => {
  try {
    const today = todayKey()
    const entry = await StreakEntry.findOneAndUpdate(
      { user: req.user._id, date: today },
      { status: 'rest', workoutId: null },
      { upsert: true, new: true }
    )
    res.json({ entry })
  } catch (err) {
    console.error('markRestDay error:', err)
    res.status(500).json({ error: err.message })
  }
}
