const axios = require('axios');
async function test() {
  console.log("Starting fetch...");
  try {
    await axios.post('http://localhost:5005/api/mess/create', { name: "t", pin: "1" });
    console.log("Success");
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();
