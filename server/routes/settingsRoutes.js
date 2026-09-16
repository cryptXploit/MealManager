const express = require('express');
const { updatePin, kickMember, resetMonthlyChart } = require('../controllers/settingsController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.post('/update-pin', updatePin);
router.delete('/kick/:memberId', kickMember);
router.post('/reset-chart', resetMonthlyChart);

module.exports = router;
