require('dotenv').config()

module.exports = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  port: process.env.PORT || 5000
}