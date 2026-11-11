// Fragt bei Perplexity Artikelname und Preis ab.
// Der Schlüssel liegt nur bei Netlify (Umgebungsvariable PERPLEXITY_API_KEY).

const ALLOWED = /(^|--)heimspiel\.netlify\.app$/;
const LIMIT_PER_HOUR = 60;
let hits = [];

const SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    price: { type: ["number", "null"] },
    shop: { type: "string" },
    url: { type: "string" }
  },
  required: ["name", "price", "shop", "url"]
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function hostOf(v) {
  try { return new URL(v).hostname; } catch { return ""; }
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Nur POST" }, 405);

  const from = hostOf(req.headers.get("origin") || req.headers.get("referer") || "");
  if (!ALLOWED.test(from)) return json({ error: "Nicht erlaubt" }, 403);

  const now = Date.now();
  hits = hits.filter((t) => now - t < 3600e3);
  if (hits.length >= LIMIT_PER_HOUR) return json({ error: "Zu viele Anfragen, bitte später nochmal." }, 429);
  hits.push(now);

  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return json({ error: "PERPLEXITY_API_KEY fehlt bei Netlify." }, 500);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Ungültige Anfrage" }, 400); }
  const q = String(body.q || "").slice(0, 200).trim();
  const url = String(body.url || "").slice(0, 600).trim();
  const mode = body.mode === "link" ? "link" : "best";
  if (!q && !url) return json({ error: "Name oder Link fehlt" }, 400);

  const task = mode === "link" && url
    ? `Öffne diesen Link und nenne den genauen Produktnamen und den aktuellen Preis in Euro genau in diesem Shop: ${url}` + (q ? `\nHinweis zum Produkt: ${q}` : "")
    : `Finde den aktuell günstigsten Neupreis in Euro für dieses Produkt bei einem seriösen Onlineshop, der nach Deutschland liefert (zum Beispiel über idealo oder Geizhals): ${q || url}` + (url && q ? `\nLink zum Produkt: ${url}` : "");

  try {
    const r = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: "Du hilfst beim Preisvergleich in Deutschland. Antworte nur mit JSON: name (kurzer, genauer Produktname auf Deutsch), price (Zahl in Euro oder null, wenn du keinen verlässlichen Preis findest), shop (Name des Shops), url (direkter Link zum Angebot). Erfinde keine Preise."
          },
          { role: "user", content: task }
        ],
        response_format: { type: "json_schema", json_schema: { schema: SCHEMA } }
      })
    });
    if (!r.ok) return json({ error: `Perplexity Fehler ${r.status}` }, 502);
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || "";
    const m = text.match(/\{[\s\S]*\}/);
    const o = m ? JSON.parse(m[0]) : {};
    let price = typeof o.price === "number" ? o.price : parseFloat(String(o.price || "").replace(",", "."));
    if (!isFinite(price) || price <= 0 || price > 100000) price = null;
    const link = /^https?:\/\//i.test(o.url || "") ? String(o.url).slice(0, 600) : "";
    return json({
      name: String(o.name || "").slice(0, 120),
      price: price === null ? null : Math.round(price * 100) / 100,
      shop: String(o.shop || "").slice(0, 60),
      url: link
    });
  } catch (e) {
    return json({ error: "Preisabfrage fehlgeschlagen" }, 502);
  }
};

export const config = { path: "/api/preis" };
