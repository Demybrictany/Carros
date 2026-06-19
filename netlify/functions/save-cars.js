const GITHUB_OWNER = "Demybrictany";
const GITHUB_REPO  = "Carros";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type"
};

async function ghGet(path) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept:        "application/vnd.github.v3+json",
      "User-Agent":  "autos-xela-netlify"
    }
  });
  return res.ok ? res.json() : null;
}

async function ghPut(path, content64, sha, message) {
  const body = { message, content: content64 };
  if (sha) body.sha = sha;
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
    method:  "PUT",
    headers: {
      Authorization:  `token ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      Accept:         "application/vnd.github.v3+json",
      "User-Agent":   "autos-xela-netlify"
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "GitHub API error " + res.status);
  return data;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };
  if (event.httpMethod !== "POST")   return { statusCode: 405, headers: CORS, body: "Method not allowed" };

  if (!GITHUB_TOKEN) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "GITHUB_TOKEN no configurado en Netlify" }) };
  }

  try {
    const payload = JSON.parse(event.body);

    /* ── Guardar lista de carros en data/cars.json ── */
    if (payload.type === "save-cars") {
      const current = await ghGet("data/cars.json");
      const content = Buffer.from(JSON.stringify({ cars: payload.cars }, null, 2)).toString("base64");
      await ghPut("data/cars.json", content, current?.sha, "Actualizar inventario de carros");
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    /* ── Subir imagen a imagenes/ ── */
    if (payload.type === "upload-image") {
      const { filename, base64 } = payload;
      const safeName = filename.replace(/[^a-zA-Z0-9._\- ]/g, "_");
      const content  = base64.replace(/^data:[^;]+;base64,/, "");
      const current  = await ghGet(`imagenes/${safeName}`);
      await ghPut(`imagenes/${safeName}`, content, current?.sha, "Subir imagen " + safeName);
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, path: `imagenes/${safeName}` }) };
    }

    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Accion desconocida" }) };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
