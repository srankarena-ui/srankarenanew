// Junta partidas del parche actual desde la Riot API y las vuelca a CSV,
// una fila por participante (10 por partida, con el rol ya etiquetado).
// El objetivo se reparte a partes iguales entre los rangos pedidos, para poder
// comparar rendimiento por rol *y* por liga.
//
//   node scripts/collect-matches.mjs --matches 1000
//   node scripts/collect-matches.mjs --region euw1 --tiers DIAMOND,MASTER --out data/parche.csv
//
// Lee RIOT_API_KEY de .env.local. La key personal caduca cada 24h: si empieza a
// dar 401/403, regenérala en developer.riotgames.com y vuelve a correrlo (el CSV
// se escribe a medida, así que lo ya bajado no se pierde).
import { appendFileSync, existsSync, readFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    region: { type: "string", default: "la1" },
    tiers: { type: "string", default: "BRONZE,SILVER,GOLD,PLATINUM,EMERALD,DIAMOND" },
    // Se muestrean dos divisiones por rango: usar solo la I sesgaría cada tramo
    // hacia su parte alta.
    divisions: { type: "string", default: "I,III" },
    queue: { type: "string", default: "420" },
    matches: { type: "string", default: "1000" },
    // Solo se piden partidas de los últimos N días. Sin esto, los jugadores de
    // rangos bajos (que juegan menos a menudo) devuelven sobre todo partidas de
    // parches anteriores: se gastaba una petición por cada una para acabar
    // descartándola. Los parches duran unas 2 semanas.
    days: { type: "string", default: "14" },
    out: { type: "string", default: "data/matches.csv" },
  },
});

const REGION = args.region;
const CLUSTER = clusterFor(REGION);
const QUEUE_ID = Number(args.queue);
const TARGET = Number(args.matches);
const SINCE = Math.floor(Date.now() / 1000) - Number(args.days) * 86400;
const TIERS = args.tiers.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);
const DIVISIONS = args.divisions.split(",").map((d) => d.trim().toUpperCase()).filter(Boolean);

// El límite de la key personal es 100 peticiones / 2 min (1,2 s de media), pero
// la comparten el sitio en producción y cualquier otro script, así que ir al
// borde sale caro: cada 429 cuesta una espera de hasta 30 s y el ritmo real se
// desploma. A 2 s (60 req/2min) sobra margen y el crawl acaba antes, aunque
// parezca lo contrario. Con production key esto se puede bajar.
const DELAY_MS = 2000;

const API_KEY = readApiKey();
if (!API_KEY) {
  console.error("Falta RIOT_API_KEY en .env.local");
  process.exit(1);
}

// Dos crawls a la vez se pisan el rate limit, se llenan de 429 y escriben
// duplicados en el mismo CSV. Un candado con el PID lo impide.
const LOCK = ".crawl.lock";
if (existsSync(LOCK)) {
  const pid = Number(readFileSync(LOCK, "utf8").trim());
  let alive = false;
  try { process.kill(pid, 0); alive = true; } catch {}
  if (alive) {
    console.error(`Ya hay un crawl corriendo (PID ${pid}). Ciérralo antes de lanzar otro.`);
    process.exit(1);
  }
}
writeFileSync(LOCK, String(process.pid));
const releaseLock = () => { try { rmSync(LOCK); } catch {} };
process.on("exit", releaseLock);
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
  process.on(sig, () => { releaseLock(); process.exit(1); });
}

function readApiKey() {
  if (process.env.RIOT_API_KEY) return process.env.RIOT_API_KEY;
  if (!existsSync(".env.local")) return null;
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.trim().startsWith("RIOT_API_KEY="));
  return line ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") : null;
}

function clusterFor(platform) {
  const p = platform.toLowerCase();
  if (["na1", "br1", "la1", "la2"].includes(p)) return "americas";
  if (["euw1", "eun1", "tr1", "ru"].includes(p)) return "europe";
  if (["kr", "jp1"].includes(p)) return "asia";
  return "sea";
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let requests = 0;
let throttled = 0;

async function riot(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(DELAY_MS);
    requests++;
    const res = await fetch(url, { headers: { "X-Riot-Token": API_KEY } });

    if (res.ok) return res.json();

    if (res.status === 429) {
      throttled++;
      const wait = Number(res.headers.get("retry-after") ?? 10);
      console.warn(`  429, esperando ${wait}s…`);
      await sleep(wait * 1000);
      continue;
    }
    // Las keys de desarrollo caducan cada 24h y ahí devuelven 401/403.
    if (res.status === 401 || res.status === 403) {
      console.error(
        `${res.status}: la key caducó o es inválida.\n`
        + "Regenera RIOT_API_KEY en https://developer.riotgames.com, actualiza .env.local y vuelve a correr."
      );
      process.exit(1);
    }
    if (res.status === 404) return null;

    console.warn(`  ${res.status} en ${url.split("/").slice(-2).join("/")}`);
    return null;
  }
  return null;
}

// Parche actual según Data Dragon: "15.14.1" → nos quedamos con "15.14", que es
// lo que match-v5 devuelve en gameVersion.
async function currentPatch() {
  const versions = await (await fetch("https://ddragon.leagueoflegends.com/api/versions.json")).json();
  return versions[0].split(".").slice(0, 2).join(".");
}

// Semilla: jugadores del rango pedido. De cada uno saldrán sus partidas
// recientes; como cada partida trae 10 participantes, los roles salen
// balanceados solos. El rango del semilla se usa como rango de la partida:
// el emparejamiento junta gente de nivel parecido, así que es buena
// aproximación sin gastar 10 peticiones extra por partida para mirar el
// rango real de cada participante.
async function seedPuuids(tier) {
  const puuids = new Set();

  for (const division of DIVISIONS) {
    const url = `https://${REGION}.api.riotgames.com/lol/league-exp/v4/entries/RANKED_SOLO_5x5/${tier}/${division}?page=1`;
    const entries = await riot(url);

    if (!entries?.length) {
      console.warn(`  sin entradas para ${tier} ${division}`);
      continue;
    }
    for (const entry of entries) {
      if (entry.puuid) puuids.add(entry.puuid);
    }
  }

  // Barajar para no tirar siempre de los mismos jugadores del principio de la
  // página, que están ordenados por LP.
  const list = [...puuids];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

const CSV_COLUMNS = [
  "match_id", "patch", "queue_id", "duration_min", "seed_tier",
  "champion", "role", "team_id", "win",
  "kills", "deaths", "assists", "kda",
  "cs", "cs_per_min", "gold", "vision_score", "wards_placed",
  "damage_to_champions", "damage_per_min",
];

function rowsFor(match, seedTier, patch) {
  const minutes = match.info.gameDuration / 60;
  return match.info.participants.map((p) => {
    const cs = (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
    return [
      match.metadata.matchId,
      patch,
      match.info.queueId,
      minutes.toFixed(1),
      seedTier,
      p.championName,
      p.teamPosition || p.individualPosition || "",
      p.teamId,
      p.win ? 1 : 0,
      p.kills, p.deaths, p.assists,
      ((p.kills + p.assists) / Math.max(1, p.deaths)).toFixed(2),
      cs,
      (cs / minutes).toFixed(2),
      p.goldEarned,
      p.visionScore,
      p.wardsPlaced,
      p.totalDamageDealtToChampions,
      (p.totalDamageDealtToChampions / minutes).toFixed(0),
    ];
  });
}

const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v);

async function main() {
  const patch = await currentPatch();
  const perTier = Math.ceil(TARGET / TIERS.length);
  console.log(`Parche ${patch} · ${REGION} · objetivo ${TARGET} partidas`);
  console.log(`Rangos: ${TIERS.join(", ")} (~${perTier} cada uno)\n`);

  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, CSV_COLUMNS.join(",") + "\n");

  const seen = new Set();
  let total = 0;
  let skippedOldPatch = 0;
  const started = Date.now();

  for (const tier of TIERS) {
    const seeds = await seedPuuids(tier);
    if (!seeds.length) {
      console.warn(`${tier}: sin jugadores semilla, se salta\n`);
      continue;
    }

    let collected = 0;
    for (const puuid of seeds) {
      if (collected >= perTier) break;

      const ids = await riot(
        `https://${CLUSTER}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids`
          + `?queue=${QUEUE_ID}&startTime=${SINCE}&start=0&count=10`
      );
      if (!ids?.length) continue;

      for (const id of ids) {
        if (collected >= perTier) break;
        if (seen.has(id)) continue;
        seen.add(id);

        const match = await riot(`https://${CLUSTER}.api.riotgames.com/lol/match/v5/matches/${id}`);
        if (!match?.info?.participants) continue;

        // gameVersion es "16.15.678.9042": comparamos solo major.minor.
        if (!match.info.gameVersion?.startsWith(patch + ".")) {
          skippedOldPatch++;
          continue;
        }
        // Partidas remake (menos de 5 min) ensucian cualquier promedio.
        if (match.info.gameDuration < 300) continue;

        appendFileSync(
          args.out,
          rowsFor(match, tier, patch).map((row) => row.map(csvCell).join(",")).join("\n") + "\n"
        );

        collected++;
        total++;
        if (collected % 25 === 0) {
          const mins = ((Date.now() - started) / 60000).toFixed(1);
          console.log(`  ${tier} ${collected}/${perTier} · total ${total}/${TARGET} · ${requests} req · ${throttled} throttles · ${mins} min`);
        }
      }
    }
    console.log(`${tier}: ${collected} partidas\n`);
  }

  const mins = ((Date.now() - started) / 60000).toFixed(1);
  console.log(`Listo: ${total} partidas (${total * 10} filas) en ${args.out}`);
  console.log(`${requests} requests · ${throttled} throttles · ${skippedOldPatch} de parches viejos · ${mins} min`);
}

main();
