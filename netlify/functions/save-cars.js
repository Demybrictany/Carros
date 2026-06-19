const GITHUB_OWNER = "Demybrictany";
const GITHUB_REPO  = "Carros";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const BIN_ID       = "6a356040f5f4af5e290fcf56";
const BIN_KEY      = "$2a$10$FyLaTG6caTU5xPQSNkUzT.Al/dst601iPSmxSSlgfdEl9k0sUgBju";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Content-Type"
};

async function ghGet(path) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3+json", "User-Agent": "autos-xela" }
  });
  return res.ok ? res.json() : null;
}

async function ghPut(path, content64, sha, message) {
  const body = { message, content: content64 };
  if (sha) body.sha = sha;
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
    method: "PUT",
    headers: { Authorization: `token ${GITHUB_TOKEN}`, "Content-Type": "application/json", Accept: "application/vnd.github.v3+json", "User-Agent": "autos-xela" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "GitHub error " + res.status);
  return data;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };
  if (event.httpMethod !== "POST")   return { statusCode: 405, headers: CORS, body: "Method not allowed" };

  try {
    const payload = JSON.parse(event.body);

    /* ── Guardar en data/cars.json via GitHub ── */
    if (payload.type === "save-cars") {
      if (!GITHUB_TOKEN) {
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "GITHUB_TOKEN no configurado" }) };
      }
      const current = await ghGet("data/cars.json");
      const content = Buffer.from(JSON.stringify({ cars: payload.cars }, null, 2)).toString("base64");
      await ghPut("data/cars.json", content, current?.sha, "Actualizar inventario");
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, via: "github" }) };
    }

    /* ── Subir imagen a imagenes/ via GitHub ── */
    if (payload.type === "upload-image") {
      if (!GITHUB_TOKEN) {
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "GITHUB_TOKEN no configurado" }) };
      }
      const { filename, base64 } = payload;
      const safeName = filename.replace(/[^a-zA-Z0-9._\- ]/g, "_");
      const content  = base64.replace(/^data:[^;]+;base64,/, "");
      const current      = await ghGet(`imagenes/${safeName}`);
      const uploadResult = await ghPut(`imagenes/${safeName}`, content, current?.sha, "Subir imagen " + safeName);
      const rawUrl       = uploadResult?.content?.download_url ||
        `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/imagenes/${safeName}`;
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, path: rawUrl }) };
    }

    /* ── Guardar en JSONBin (fallback sin token) ── */
    if (payload.type === "save-jsonbin") {
      const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", "X-Master-Key": BIN_KEY },
        body:    JSON.stringify({ cars: payload.cars })
      });
      const data = await res.json();
      if (!res.ok) return { statusCode: res.status, headers: CORS, body: JSON.stringify({ error: data.message || "JSONBin error" }) };
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, via: "jsonbin" }) };
    }

    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Accion desconocida" }) };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
