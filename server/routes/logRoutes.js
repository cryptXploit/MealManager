const express = require('express');
const { addLog } = require('../controllers/logController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.post('/add', addLog);

module.exports = router;
