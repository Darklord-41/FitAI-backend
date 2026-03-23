const mongoose = require('mongoose')

const streakEntrySchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:      { type: String, required: true },  // YYYY-MM-DD (local date, no timezone drift)
  status:    { type: String, enum: ['done', 'intense', 'missed', 'rest'], default: 'done' },
  workoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workout', default: null },
}, { timestamps: true })

streakEntrySchema.index({ user: 1, date: 1 }, { unique: true })

module.exports = mongoose.model('StreakEntry', streakEntrySchema)
