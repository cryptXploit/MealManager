const supabaseAdmin = require('../services/supabaseAdmin')

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }
  const token = authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Invalid token format' })

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) {
    console.error('Auth error:', error?.message)
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  req.user = user
  next()
}

module.exports = authMiddleware