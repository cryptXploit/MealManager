require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function test() {
  console.log("Testing connection...");
  const { data, error } = await supabaseAdmin.from('messes').select('*').limit(1);
  console.log("Result:", { data, error });
}
test();
