const express = require('express');
const { addMessage } = require('../controllers/chatController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.post('/add', addMessage);

module.exports = router;
