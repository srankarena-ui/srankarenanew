// Recarga sellos para probar el flujo de castigos sin quedarte sin munición.
//
//   node scripts/dev-seals.mjs                  → deja a hydro con 100 sin gastar
//   node scripts/dev-seals.mjs Javo 5           → 5 para Javo
//   node scripts/dev-seals.mjs hydro 100 --wipe → borra también los castigos que lanzó
//
// Solo toca sellos con riot_match_id que empieza por DEMO_, así que nunca pisa
// los que reparte el sync. Fuera de producción: usa la service role de
// .env.local, que no sale del repo.
import { readFileSync } from "node:fs";

for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };

const [username = "hydro", cantidadArg = "100"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const cantidad = Number(cantidadArg);
const wipe = process.argv.includes("--wipe");

const api = (path, init) => fetch(`${SB}/rest/v1/${path}`, { headers: H, ...init });

const [profile] = await api(`profiles?select=id,username&username=eq.${username}`).then((r) => r.json());
if (!profile) { console.error(`No existe el perfil "${username}"`); process.exit(1); }

const enrollments = await api(
  `summoner_trials_enrollments?select=tournament_id&user_id=eq.${profile.id}`
).then((r) => r.json());
if (!enrollments.length) { console.error(`${username} no está inscrito en ningún torneo`); process.exit(1); }
const tournamentId = enrollments[0].tournament_id;

// Fuera los demo anteriores para que la cuenta quede exacta y no se acumulen.
await api(`seals?user_id=eq.${profile.id}&riot_match_id=like.DEMO_*`, { method: "DELETE" });

if (wipe) {
  await api(`challenges?created_by=eq.${profile.id}&tournament_id=eq.${tournamentId}`, { method: "DELETE" });
  console.log("castigos lanzados por este usuario borrados");
}

const rows = Array.from({ length: cantidad }, (_, i) => ({
  user_id: profile.id,
  tournament_id: tournamentId,
  reason: "masacre",
  riot_match_id: `DEMO_${String(i + 1).padStart(4, "0")}`,
}));

const res = await api("seals", { method: "POST", body: JSON.stringify(rows) });
if (!res.ok) { console.error(res.status, (await res.text()).slice(0, 300)); process.exit(1); }

const quedan = await api(
  `seals?select=id&user_id=eq.${profile.id}&spent_at=is.null`
).then((r) => r.json());

console.log(`${username}: ${quedan.length} sellos sin gastar`);
console.log("vuelve a ejecutarlo cuando se agoten, o pásale otro número");
