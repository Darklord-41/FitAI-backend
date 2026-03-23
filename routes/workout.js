const router = require('express').Router()
const auth   = require('../middleware/auth')
const {
  getWorkouts,
  getWorkoutById,
  createWorkout,
  updateWorkout,
  completeWorkout,
  deleteWorkout,
  getStreakData,
  markRestDay,
} = require('../controllers/workoutController')

// NOTE: /streak must be defined BEFORE /:id to avoid "streak" being treated as an id
router.get('/streak',         auth, getStreakData)
router.post('/streak/rest',   auth, markRestDay)

router.get('/',               auth, getWorkouts)
router.post('/',              auth, createWorkout)
router.get('/:id',            auth, getWorkoutById)
router.put('/:id',            auth, updateWorkout)
router.put('/:id/complete',   auth, completeWorkout)
router.delete('/:id',         auth, deleteWorkout)

module.exports = router
