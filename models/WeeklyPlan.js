const mongoose = require('mongoose')

const planExerciseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sets: { type: String, default: '' },      // original description from Python, e.g. "3×10 reps"
}, { _id: false })

const planDaySchema = new mongoose.Schema({
  day:       { type: String, required: true },  // "Monday", "Tuesday", etc.
  exercises: [planExerciseSchema],
}, { _id: false })

const weeklyPlanSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planData: [planDaySchema],   // 7 day objects from Python output
  goal:     { type: String },
  level:    { type: String },
  active:   { type: Boolean, default: true },
}, { timestamps: true })

weeklyPlanSchema.index({ user: 1, active: 1 })

module.exports = mongoose.model('WeeklyPlan', weeklyPlanSchema)
