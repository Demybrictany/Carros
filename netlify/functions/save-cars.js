const BIN_ID     = "6a356040f5f4af5e290fcf56";
const MASTER_KEY = "$2a$10$FyLaTG6caTU5xPQSNkUzT.Al/dst601iPSmxSSlgfdEl9k0sUgBju";

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Method not allowed" };
  }

  try {
    const payload = JSON.parse(event.body);
    const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json", "X-Master-Key": MASTER_KEY },
      body:    JSON.stringify(payload)
    });
    const data = await res.json();
    return { statusCode: res.ok ? 200 : res.status, headers, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
