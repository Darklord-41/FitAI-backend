const mongoose = require('mongoose')

const exerciseSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  sets:     { type: Number, default: null },
  reps:     { type: Number, default: null },
  weight:   { type: Number, default: null },   // kg or lbs depending on user.units
  duration: { type: Number, default: null },   // seconds (for timed exercises)
  done:     { type: Boolean, default: false },
})

const workoutSchema = new mongoose.Schema({
  user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:           { type: String, required: true, trim: true },
  category:        { type: String, trim: true },
  level:           { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'] },
  durationMinutes: { type: Number, default: null },
  exercises:       [exerciseSchema],
  completedAt:     { type: Date, default: null },
  notes:           { type: String, default: '' },
  totalVolume:     { type: Number, default: 0 }, // sum of (weight * reps) across all exercises
}, { timestamps: true })

// Auto-compute totalVolume before saving
workoutSchema.pre('save', function (next) {
  this.totalVolume = this.exercises.reduce((sum, ex) => {
    if (ex.weight && ex.reps && ex.sets) {
      return sum + ex.weight * ex.reps * ex.sets
    }
    return sum
  }, 0)
  next()
})

module.exports = mongoose.model('Workout', workoutSchema)
