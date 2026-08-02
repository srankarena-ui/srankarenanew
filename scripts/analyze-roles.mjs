// Resume el CSV de collect-matches.mjs en una tabla de referencia por rol:
// cuánto es "normal" y cuánto es "excepcional" en cada estadística, para cada
// posición. Sirve para puntuar sin comparar peras con manzanas — la visión de
// un support y la de un mid no son la misma escala.
//
// La salida va directo a donde la lee la app (src/core/lib/role-score.ts), y se
// commitea: cambia una vez por parche, no hace falta base de datos.
//
//   node scripts/analyze-roles.mjs
//   node scripts/analyze-roles.mjs --in data/matches.csv --out src/core/config/role-baselines.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    in: { type: "string", default: "data/matches.csv" },
    out: { type: "string", default: "src/core/config/role-baselines.json" },
  },
});

// Las que tiene sentido puntuar. Se dejan fuera las descriptivas (campeón,
// duración, equipo) y las que ya están normalizadas por tiempo aparte.
const STATS = [
  "kda", "kills", "deaths", "assists",
  "cs_per_min", "vision_score", "wards_placed", "damage_per_min", "gold", "kill_participation",
];

const ROLES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

const raw = readFileSync(args.in, "utf8").trim().split("\n");
const header = raw[0].split(",");
const rows = raw.slice(1).map((line) => {
  const cells = line.split(",");
  return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
});

// Participación en asesinatos: no viene en el CSV, pero se deriva sumando las
// bajas de cada equipo (el CSV trae los 10 participantes de cada partida).
const teamKills = {};
for (const r of rows) {
  const k = r.match_id + "|" + r.team_id;
  teamKills[k] = (teamKills[k] ?? 0) + Number(r.kills);
}
for (const r of rows) {
  const total = teamKills[r.match_id + "|" + r.team_id];
  r.kill_participation = total > 0
    ? ((Number(r.kills) + Number(r.assists)) / total).toFixed(4)
    : "0";
}

const percentile = (sorted, p) => {
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * p;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  return low === high ? sorted[low] : sorted[low] + (sorted[high] - sorted[low]) * (index - low);
};

const round = (n) => Math.round(n * 100) / 100;

function summarize(subset) {
  const stats = {};
  for (const stat of STATS) {
    const values = subset.map((r) => Number(r[stat])).filter(Number.isFinite).sort((a, b) => a - b);
    if (!values.length) continue;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sd = Math.sqrt(values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length);

    stats[stat] = {
      mean: round(mean),
      sd: round(sd),
      p10: round(percentile(values, 0.1)),
      p25: round(percentile(values, 0.25)),
      p50: round(percentile(values, 0.5)),
      p75: round(percentile(values, 0.75)),
      p90: round(percentile(values, 0.9)),
    };
  }
  return stats;
}

// Rangos presentes en el CSV, ordenados de menor a mayor.
const TIER_ORDER = [
  "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD",
  "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER",
];
const tiers = [...new Set(rows.map((r) => r.seed_tier))]
  .filter(Boolean)
  .sort((a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b));

const baselines = {
  patch: rows[0]?.patch ?? "?",
  sampleRows: rows.length,
  tiers,
  roles: {},
  // Mismo desglose abierto por rango, para ver cuánto se mueve el listón entre
  // ligas antes de decidir si la puntuación debe depender del rango o no.
  byTier: {},
};

for (const role of ROLES) {
  const inRole = rows.filter((r) => r.role === role);
  if (!inRole.length) continue;
  baselines.roles[role] = { n: inRole.length, stats: summarize(inRole) };
}

for (const tier of tiers) {
  baselines.byTier[tier] = {};
  for (const role of ROLES) {
    const subset = rows.filter((r) => r.seed_tier === tier && r.role === role);
    if (!subset.length) continue;
    baselines.byTier[tier][role] = { n: subset.length, stats: summarize(subset) };
  }
}

// Tabla 1 — por rol, todos los rangos juntos: p50 (lo normal) → p90 (destacable).
for (const stat of STATS) {
  console.log(`\n${stat}`);
  console.log("  rol        n      p25      p50      p75      p90");
  for (const role of ROLES) {
    const s = baselines.roles[role]?.stats[stat];
    if (!s) continue;
    const n = String(baselines.roles[role].n).padStart(5);
    const cells = [s.p25, s.p50, s.p75, s.p90].map((v) => String(v).padStart(8)).join("");
    console.log(`  ${role.padEnd(9)}${n}${cells}`);
  }
}

// Tabla 2 — medianas por rango, para ver cuánto sube el listón al subir de liga.
const TIER_STATS = ["kda", "cs_per_min", "vision_score", "damage_per_min"];
for (const stat of TIER_STATS) {
  console.log(`\n=== ${stat} — mediana por rango ===`);
  console.log("  rol       " + tiers.map((t) => t.slice(0, 8).padStart(9)).join(""));
  for (const role of ROLES) {
    const cells = tiers
      .map((t) => String(baselines.byTier[t]?.[role]?.stats[stat]?.p50 ?? "-").padStart(9))
      .join("");
    console.log(`  ${role.padEnd(10)}${cells}`);
  }
  console.log("  n         " + tiers.map((t) => String(baselines.byTier[t]?.MIDDLE?.n ?? 0).padStart(9)).join(""));
}

mkdirSync(dirname(args.out), { recursive: true });
writeFileSync(args.out, JSON.stringify(baselines, null, 2));
console.log(`\n${rows.length} filas analizadas → ${args.out}`);
