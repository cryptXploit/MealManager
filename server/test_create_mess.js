require('dotenv').config();
const { createMess } = require('./controllers/messController');

async function test() {
  const req = {
    body: { name: "testmess_" + Date.now(), pin: "1234" },
    user: { id: "00000000-0000-0000-0000-000000000000" } // dummy uuid
  };
  const res = {
    status: (code) => ({
      json: (data) => console.log("Response:", code, data)
    }),
    json: (data) => console.log("Response: 200", data)
  };
  
  console.log("Calling createMess...");
  try {
    await createMess(req, res);
  } catch (e) {
    console.log("Exception:", e);
  }
}
test();
