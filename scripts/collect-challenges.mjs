// Vuelve a pedir las partidas que ya están en data/matches.csv, esta vez
// quedándose con el participante ENTERO: `challenges` (las ~129 métricas que Riot
// calcula). Sirve para medir cada cuánto ocurre de verdad cada gesta y poner
// precios a los logros con datos en vez de a ojo.
//
//   node scripts/collect-challenges.mjs
//   node scripts/collect-challenges.mjs --in data/matches.csv --out data/challenges.jsonl
//
// Sale un JSONL: una línea por actuación individual. `c` lleva las métricas
// calculadas distintas de cero (dispersas, para que ocupe poco) y `raw` lleva el
// participante tal cual, sin recortar.
import { appendFileSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    in: { type: "string", default: "data/matches.csv" },
    out: { type: "string", default: "data/challenges.jsonl" },
    cluster: { type: "string", default: "americas" },
  },
});

const DELAY_MS = 2000;

function readApiKey() {
  if (process.env.RIOT_API_KEY) return process.env.RIOT_API_KEY;
  if (!existsSync(".env.local")) return null;
  const line = readFileSync(".env.local", "utf8").split("\n")
    .find((l) => l.trim().startsWith("RIOT_API_KEY="));
  return line ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") : null;
}

const API_KEY = readApiKey();
if (!API_KEY) { console.error("Falta RIOT_API_KEY en .env.local"); process.exit(1); }

const LOCK = ".challenges.lock";
if (existsSync(LOCK)) {
  const pid = Number(readFileSync(LOCK, "utf8").trim());
  let alive = false;
  try { process.kill(pid, 0); alive = true; } catch {}
  if (alive) { console.error(`Ya hay una recogida corriendo (PID ${pid}).`); process.exit(1); }
}
writeFileSync(LOCK, String(process.pid));
const release = () => { try { rmSync(LOCK); } catch {} };
process.on("exit", release);
for (const s of ["SIGINT","SIGTERM","SIGHUP","SIGBREAK"]) process.on(s, () => { release(); process.exit(1); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let requests = 0, throttled = 0;

async function riot(url) {
  for (let i = 0; i < 5; i++) {
    await sleep(DELAY_MS);
    requests++;
    const res = await fetch(url, { headers: { "X-Riot-Token": API_KEY } });
    if (res.ok) return res.json();
    if (res.status === 429) {
      throttled++;
      const w = Number(res.headers.get("retry-after") ?? 10);
      await sleep(w * 1000);
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      console.error(`${res.status}: la key caducó. Regenérala y vuelve a correr (lo bajado se conserva).`);
      process.exit(1);
    }
    return null;
  }
  return null;
}

// Identificadores y su rango, del CSV que ya tenemos.
const lines = readFileSync(args.in, "utf8").trim().split("\n");
const header = lines[0].split(",");
const iId = header.indexOf("match_id"), iTier = header.indexOf("seed_tier");
const tiers = new Map();
for (const l of lines.slice(1)) {
  const c = l.split(",");
  tiers.set(c[iId], c[iTier]);
}

// Reanudable: si el JSONL ya tiene partidas, se saltan.
const done = new Set();
if (existsSync(args.out)) {
  for (const l of readFileSync(args.out, "utf8").split("\n")) {
    if (!l.trim()) continue;
    try { done.add(JSON.parse(l).m); } catch {}
  }
  console.log(`Ya había ${done.size} partidas recogidas, se reanudan las que faltan.`);
} else {
  writeFileSync(args.out, "");
}

const pending = [...tiers.keys()].filter((id) => !done.has(id));
console.log(`${pending.length} partidas por recoger (de ${tiers.size})\n`);

const started = Date.now();
let ok = 0;

for (const [n, id] of pending.entries()) {
  const m = await riot(`https://${args.cluster}.api.riotgames.com/lol/match/v5/matches/${id}`);
  if (!m?.info?.participants) continue;

  const rows = m.info.participants.map((p) => {
    const c = {};
    for (const [k, v] of Object.entries(p.challenges ?? {})) {
      if (typeof v === "number" && v !== 0) c[k] = v;
      else if (v === true) c[k] = 1;
    }
    // El participante entero, no una selección. Guardar solo `challenges` más
    // seis campos elegidos a mano costó tener que ir a otro fichero para
    // responder "¿cuántos aciertan 22 kills?" — `challenges` da `takedowns`
    // (kills + asistencias) pero nunca los separa. Un crawl cuesta horas contra
    // el límite de 100 peticiones cada 2 minutos y `data/` está fuera de git,
    // así que tirar campos para ahorrar disco es el peor cambio posible.
    // `perks` fuera: son ~2 KB por fila de árboles de runas que no se analizan.
    const { challenges: _c, perks: _p, ...raw } = p;
    return {
      m: id,
      t: tiers.get(id),
      r: p.teamPosition || p.individualPosition || "",
      w: p.win ? 1 : 0,
      gameDuration: m.info.gameDuration,
      queueId: m.info.queueId,
      c,
      raw,
    };
  });

  appendFileSync(args.out, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  ok++;

  if (ok % 50 === 0) {
    const mins = ((Date.now() - started) / 60000).toFixed(1);
    console.log(`  ${ok}/${pending.length} · ${requests} req · ${throttled} throttles · ${mins} min`);
  }
}

console.log(`\nListo: ${ok} partidas (${ok * 10} actuaciones) en ${args.out}`);
console.log(`${requests} requests · ${throttled} throttles · ${((Date.now() - started) / 60000).toFixed(1)} min`);
