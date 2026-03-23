const jwt  = require('jsonwebtoken')
const User = require('../models/User')

/**
 * Auth middleware — validates the Bearer JWT in the Authorization header
 * and attaches the fresh user document (without password) to req.user.
 *
 * Usage: router.get('/protected', auth, controller)
 */
module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please log in.' })
  }

  try {
    const token   = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Always fetch fresh from DB so profile updates are reflected immediately
    const user = await User.findById(decoded.id).select('-password')
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' })
    }
    if (!user.isVerified) {
      return res.status(403).json({ error: 'Email not verified', userId: user._id })
    }

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' })
    }
    return res.status(401).json({ error: 'Invalid token. Please log in again.' })
  }
}
