const supabaseAdmin = require('../services/supabaseAdmin')

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }
  const token = authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Invalid token format' })

// Bypass auth for testing
  req.user = { id: '00000000-0000-0000-0000-000000000000' }
  next()
}

module.exports = authMiddleware