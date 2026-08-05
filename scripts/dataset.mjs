// Carga las 10.020 actuaciones reales del parche 16.15 con TODO lo que hay de
// cada una, uniendo los dos ficheros del mismo crawl:
//
//   data/matches.csv        kills, deaths, assists, cs, oro, daño, duración…
//   data/challenges.jsonl   las ~129 métricas calculadas de match-v5
//
// Existen por separado porque se recogieron en dos pasadas, y el JSONL guardaba
// solo `challenges` — donde Riot da `takedowns` (kills + asistencias) pero nunca
// los separa. Usar solo uno de los dos lleva a creer que falta un dato que sí
// está. La clave (match_id, rol, victoria) es única y casa 10.020/10.020.
//
//   import { loadPerformances } from "./dataset.mjs";
//   const rows = await loadPerformances();
//   rows.filter(r => r.kills >= 22).length

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const NUM = new Set([
  "duration_min", "kills", "deaths", "assists", "kda", "cs", "cs_per_min",
  "gold", "vision_score", "wards_placed", "damage_to_champions", "damage_per_min",
  "team_id", "queue_id",
]);

export function loadPerformances({
  csv = "data/matches.csv",
  jsonl = "data/challenges.jsonl",
} = {}) {
  const [head, ...lines] = readFileSync(csv, "utf8").trim().split(/\r?\n/);
  const cols = head.split(",");

  const rows = lines.map((line) => {
    const v = line.split(",");
    const o = {};
    cols.forEach((c, i) => (o[c] = NUM.has(c) ? Number(v[i]) : v[i]));
    o.win = v[cols.indexOf("win")] === "1";
    return o;
  });

  // Clave única: en cada partida un rol aparece una vez por equipo, y los dos
  // equipos tienen resultados opuestos.
  const byKey = new Map(rows.map((r) => [`${r.match_id}|${r.role}|${r.win ? 1 : 0}`, r]));

  let unidas = 0;
  for (const line of readFileSync(jsonl, "utf8").trim().split("\n")) {
    if (!line.trim()) continue;
    const j = JSON.parse(line);
    const target = byKey.get(`${j.m}|${j.r}|${j.w}`);
    if (!target) continue;
    target.c = j.c ?? {};
    if (j.raw) Object.assign(target, j.raw); // crawls nuevos traen el participante entero
    unidas++;
  }

  if (unidas < rows.length) {
    console.warn(
      `aviso: ${rows.length - unidas} de ${rows.length} actuaciones sin métricas calculadas`
    );
  }

  return rows;
}

// Comprobación: se ejecuta al llamar al fichero directamente. pathToFileURL y
// no plantilla a mano: en Windows la ruta es C:\… y sale un file:// con una
// barra de menos, así que la comparación nunca daba verdadero y el check
// se saltaba en silencio.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const rows = loadPerformances();
  const pct = (f) => `${((100 * rows.filter(f).length) / rows.length).toFixed(2)}%`;

  console.log(`${rows.length} actuaciones con kills, asistencias y métricas juntas\n`);
  console.log("  22+ kills          ", pct((r) => r.kills >= 22));
  console.log("  30+ asistencias    ", pct((r) => r.assists >= 30));
  console.log("  KDA > 20           ", pct((r) => (r.kills + r.assists) / Math.max(1, r.deaths) > 20));
  console.log("  ganar en 40+ min   ", pct((r) => r.win && r.duration_min >= 40));
  console.log("  cuadrakill         ", pct((r) => (r.c?.quadraKills ?? 0) > 0));

  const sinUnir = rows.filter((r) => !r.c).length;
  if (sinUnir) throw new Error(`${sinUnir} filas sin unir: los dos ficheros no son del mismo crawl`);
  console.log("\nOK: los dos ficheros unen sin perder una sola fila.");
}
