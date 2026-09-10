async function test() {
  console.log("Starting fetch...");
  try {
    const res = await fetch('http://localhost:5005/api/mess/create', { method: 'POST', body: JSON.stringify({name:"1", pin:"1"}), headers: {'Content-Type': 'application/json'} });
    console.log("Success", res.status, await res.text());
    console.log("Headers:");
    res.headers.forEach((v,k) => console.log(k,v));
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();
