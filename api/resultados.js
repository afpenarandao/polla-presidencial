// ============================================================
//  api/resultados.js  ·  Función serverless de Vercel
//  Fuente: https://resultados.registraduria.gov.co/json/ACT/PR/00.json
// ============================================================

const FUENTE_URL = "https://resultados.registraduria.gov.co/json/ACT/PR/00.json";

const CLAVES = {
  cepeda:   ["CEPEDA"],
  paloma:   ["VALENCIA"],
  abelardo: ["ESPRIELLA"]
};

// Cabeceras de navegador para que la Registraduría no bloquee la petición
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "es-CO,es;q=0.9",
  "Referer": "https://resultados.registraduria.gov.co/"
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=30");

  // Reintenta hasta 3 veces por si el servidor está saturado
  let data = null, ultimoError = "";
  for (let intento = 0; intento < 3 && !data; intento++) {
    try {
      const r = await fetch(FUENTE_URL + "?t=" + Date.now(), { headers: HEADERS });
      if (!r.ok) { ultimoError = "HTTP " + r.status; continue; }
      data = await r.json();
    } catch (e) {
      ultimoError = String(e);
    }
  }

  if (!data) {
    return res.status(502).json({ error: "No se pudo leer la Registraduría", detalle: ultimoError });
  }

  try {
    const mesas = parseFloat((data?.totales?.act?.pmesesc || "0%").replace("%", "")) || 0;
    const partidos = data?.camaras?.[0]?.partotabla || [];
    const out = { cepeda: 0, paloma: 0, abelardo: 0, mesas };

    for (const partido of partidos) {
      const cands = partido?.act?.cantotabla || [];
      for (const cand of cands) {
        const apellido = String(cand.apecan || "").toUpperCase();
        const pct = parseFloat(String(cand.pvot || "0%").replace("%", "")) || 0;
        for (const [id, claves] of Object.entries(CLAVES)) {
          if (claves.some(k => apellido.includes(k))) out[id] = pct;
        }
      }
    }
    return res.status(200).json(out);
  } catch (e) {
    return res.status(502).json({ error: "Formato inesperado", detalle: String(e) });
  }
}
