// ============================================================
//  api/resultados.js  ·  Función serverless de Vercel
//  Fuente: https://resultados.registraduria.gov.co/json/ACT/PR/00.json
// ============================================================

const FUENTE_URL = "https://resultados.registraduria.gov.co/json/ACT/PR/00.json";

// Apellidos que identifican a cada candidato en el JSON
const CLAVES = {
  cepeda:   ["CEPEDA"],
  paloma:   ["VALENCIA"],
  abelardo: ["ESPRIELLA"]
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=30");

  try {
    const r = await fetch(FUENTE_URL, {
      headers: { "User-Agent": "polla-amix/1.0" }
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();

    // % mesas escrutadas (viene como "12.5%", quitamos el símbolo)
    const mesas = parseFloat(
      (data?.totales?.act?.pmesesc || "0%").replace("%", "")
    ) || 0;

    // Recorremos todos los candidatos dentro de camaras[0].partotabla
    const partidos = data?.camaras?.[0]?.partotabla || [];
    const out = { cepeda: 0, paloma: 0, abelardo: 0, mesas };

    for (const partido of partidos) {
      const cands = partido?.act?.cantotabla || [];
      for (const cand of cands) {
        const apellido = String(cand.apecan || "").toUpperCase();
        const pct = parseFloat(String(cand.pvot || "0%").replace("%", "")) || 0;
        for (const [id, claves] of Object.entries(CLAVES)) {
          if (claves.some(k => apellido.includes(k))) {
            out[id] = pct;
          }
        }
      }
    }

    return res.status(200).json(out);
  } catch (e) {
    return res.status(502).json({
      error: "No se pudo leer la Registraduría",
      detalle: String(e)
    });
  }
}
