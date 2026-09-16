const express = require('express');
const { getDashboardData } = require('../controllers/homeController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/data/:messId', getDashboardData);

module.exports = router;
