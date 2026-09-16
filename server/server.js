require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const errorHandler = require('./middlewares/errorHandler')

// Import Routes
const messRoutes = require('./routes/messRoutes')
const homeRoutes = require('./routes/homeRoutes')
const mealRoutes = require('./routes/mealRoutes')
const expenseRoutes = require('./routes/expenseRoutes')
const chatRoutes = require('./routes/chatRoutes')
const logRoutes = require('./routes/logRoutes')
const settingsRoutes = require('./routes/settingsRoutes')

const app = express()
const PORT = process.env.PORT || 5000

app.use(helmet())
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))

// Mount Routes
app.use('/api/mess', messRoutes)
app.use('/api/home', homeRoutes)
app.use('/api/meals', mealRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/settings', settingsRoutes)

app.use(errorHandler)

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))