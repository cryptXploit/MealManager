const express = require('express')
const { createMess, joinMess, getMe } = require('../controllers/messController')
const authMiddleware = require('../middlewares/authMiddleware')

const router = express.Router()
router.use(authMiddleware)

router.get('/me', getMe)
router.post('/create', createMess)
router.post('/join', joinMess)

module.exports = router