// Comprueba que tras un sync todas las inscripciones tienen rango guardado.
import fs from "node:fs";
import assert from "node:assert";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;

const rows = await fetch(
  `${SB}/rest/v1/summoner_trials_enrollments?select=user_id,region,matches_tracked,stats_snapshot`,
  { headers: { apikey: SRK, Authorization: `Bearer ${SRK}` } }
).then((r) => r.json());

let withRank = 0;
for (const e of rows) {
  const s = e.stats_snapshot ?? {};
  const label = s.rank_tier ? `${s.rank_tier} ${s.rank_division ?? ""} ${s.rank_lp}LP` : "SIN RANGO";
  console.log(`${e.region.padEnd(5)} tracked=${e.matches_tracked}  ${label}`);
  if (s.rank_tier) withRank++;
}

console.log(`\n${withRank}/${rows.length} con rango`);
assert(withRank === rows.length, "hay inscripciones sin rango tras el sync");
console.log("OK: todas las inscripciones tienen rango, jueguen o no.");
