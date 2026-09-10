require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function check() {
  const { data, error } = await supabaseAdmin.from('messes').select('*');
  console.log("Messes:", data, error);
}
check();
