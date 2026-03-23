const express     = require('express')
const mongoose    = require('mongoose')
const cors        = require('cors')
const cookieParser = require('cookie-parser')
const path        = require('path')
require('dotenv').config()

const app = express()

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  // TODO: Set CLIENT_URL in .env to your frontend's origin (e.g. https://yourapp.com)
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Serve uploaded files (avatars etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'))
app.use('/api/user',     require('./routes/user'))
app.use('/api/workouts', require('./routes/workout'))
app.use('/api/fitness',  require('./routes/fitness'))

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status: 'OK', timestamp: new Date() })
)

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ error: 'Route not found' })
)

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

// ─── DB + Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000

mongoose
  // TODO: Set MONGO_URI in .env (e.g. mongodb+srv://user:pass@cluster.mongodb.net/fitai)
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fitai')
  .then(() => {
    console.log('✅ MongoDB connected')
    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    )
  })
  .catch((err) => {
    console.error('❌ DB connection failed:', err.message)
    process.exit(1)
  })
