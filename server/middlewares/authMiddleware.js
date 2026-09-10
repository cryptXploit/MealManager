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
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  // Fetch the user's profile to know their mess_id
  const { data: profile } = await supabaseAdmin.from('profiles').select('mess_id').eq('id', user.id).single()
  
  req.user = user
  req.user.mess_id = profile?.mess_id || null
  next()
}

module.exports = authMiddleware