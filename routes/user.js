const router = require('express').Router()
const multer = require('multer')
const path   = require('path')
const fs     = require('fs')
const auth   = require('../middleware/auth')
const {
  getProfile,
  updateProfile,
  updateSettings,
  changePassword,
  deleteAccount,
  uploadAvatar,
} = require('../controllers/userController')

// ── Multer config for avatar uploads ─────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads/avatars')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${req.user._id}-${Date.now()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('Only image files (jpg, png, gif, webp) are allowed'))
  },
})

// All user routes require authentication
router.get('/profile',   auth, getProfile)
router.put('/profile',   auth, updateProfile)
router.put('/settings',  auth, updateSettings)
router.put('/password',  auth, changePassword)
router.delete('/account',auth, deleteAccount)
router.post('/avatar',   auth, upload.single('avatar'), uploadAvatar)

module.exports = router
