const express = require('express');
const { addMeal, deleteMeal } = require('../controllers/mealController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.post('/add', addMeal);
router.delete('/delete/:id', deleteMeal);

module.exports = router;
