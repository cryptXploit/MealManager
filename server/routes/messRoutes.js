const express = require('express')
const { updatePin, kickMember, resetMonthlyChart, createMess, joinMess } = require('../controllers/messController')
const authMiddleware = require('../middlewares/authMiddleware')

const router = express.Router()
router.use(authMiddleware)

router.post('/create', createMess)
router.post('/join', joinMess)
router.post('/update-pin', updatePin)
router.delete('/kick/:memberId', kickMember)
router.post('/reset-chart', resetMonthlyChart)

module.exports = router