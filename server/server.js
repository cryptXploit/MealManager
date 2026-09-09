require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const messRoutes = require('./routes/messRoutes')
const errorHandler = require('./middlewares/errorHandler')

const app = express()
const PORT = process.env.PORT || 5000

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }))
app.use(express.json())
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))

app.use('/api/mess', messRoutes)

app.use(errorHandler)

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
app.use(cors({ origin: 'http://localhost:3000', credentials: true }))