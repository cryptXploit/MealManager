require('dotenv').config({ path: '../client/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  console.log("Signing in (or signing up)...");
  // Let's create a dummy user
  const email = "omars_" + Date.now() + "@gmail.com";
  const password = "Password123!";
  
  let { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    console.log("Signup failed:", error.message);
    return;
  }
  
  // Wait, signUp with email confirmation turned on might not return session!
  if (!data.session) {
      console.log("No session returned. Email confirmation might be enabled.");
      // I'll try to insert a profile for a dummy UUID and bypass authMiddleware using my previous trick?
      // No, the user backend is running! I can't modify the user's running backend memory.
      return;
  }
  
  const token = data.session.access_token;
  console.log("Got token!");
  
  console.log("Calling POST /api/mess/create...");
  try {
    const res = await fetch('http://localhost:5005/api/mess/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: "mess_" + Date.now(), pin: "1234" })
    });
    
    const text = await res.text();
    console.log("Response status:", res.status);
    console.log("Response body:", text);
  } catch (e) {
    console.log("Fetch failed:", e.message);
  }
}
test();
