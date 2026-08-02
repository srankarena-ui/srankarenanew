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
  "cs_per_min", "vision_score", "wards_placed", "damage_per_min", "gold",
];

const ROLES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

const raw = readFileSync(args.in, "utf8").trim().split("\n");
const header = raw[0].split(",");
const rows = raw.slice(1).map((line) => {
  const cells = line.split(",");
  return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
});

const percentile = (sorted, p) => {
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * p;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  return low === high ? sorted[low] : sorted[low] + (sorted[high] - sorted[low]) * (index - low);
};

const round = (n) => Math.round(n * 100) / 100;

const baselines = { patch: rows[0]?.patch ?? "?", sampleRows: rows.length, roles: {} };

for (const role of ROLES) {
  const inRole = rows.filter((r) => r.role === role);
  if (!inRole.length) continue;

  const stats = {};
  for (const stat of STATS) {
    const values = inRole.map((r) => Number(r[stat])).filter(Number.isFinite).sort((a, b) => a - b);
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

  baselines.roles[role] = { n: inRole.length, stats };
}

// Tabla en consola: p50 (lo normal) → p90 (lo destacable) por rol.
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

mkdirSync(dirname(args.out), { recursive: true });
writeFileSync(args.out, JSON.stringify(baselines, null, 2));
console.log(`\n${rows.length} filas analizadas → ${args.out}`);
