const express = require('express');
const { addExpense, deleteExpense } = require('../controllers/expenseController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.post('/add', addExpense);
router.delete('/delete/:id', deleteExpense);

module.exports = router;
