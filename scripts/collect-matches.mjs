// Junta partidas del parche actual desde la Riot API y las vuelca a CSV,
// una fila por participante (10 por partida, con el rol ya etiquetado).
//
//   node scripts/collect-matches.mjs --matches 300
//   node scripts/collect-matches.mjs --region euw1 --tiers DIAMOND,PLATINUM --out data/parche.csv
//
// Lee RIOT_API_KEY de .env.local. La key personal caduca cada 24h: si empieza a
// dar 403, regenérala en developer.riotgames.com y vuelve a correrlo (el CSV se
// escribe a medida, así que lo ya bajado no se pierde).
import { appendFileSync, existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    region: { type: "string", default: "la1" },
    tiers: { type: "string", default: "DIAMOND,EMERALD,PLATINUM" },
    division: { type: "string", default: "I" },
    queue: { type: "string", default: "420" },
    matches: { type: "string", default: "300" },
    out: { type: "string", default: "data/matches.csv" },
  },
});

const REGION = args.region;
const CLUSTER = clusterFor(REGION);
const QUEUE_ID = Number(args.queue);
const TARGET = Number(args.matches);

// ponytail: espera fija entre requests para no pasar el límite de la key
// personal (100 req/2min = 50/min). Si algún día se usa una production key,
// bajar este número es todo lo que hace falta.
const DELAY_MS = 1300;

const API_KEY = readApiKey();
if (!API_KEY) {
  console.error("Falta RIOT_API_KEY en .env.local");
  process.exit(1);
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

async function riot(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(DELAY_MS);
    requests++;
    const res = await fetch(url, { headers: { "X-Riot-Token": API_KEY } });

    if (res.ok) return res.json();

    if (res.status === 429) {
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

// Semilla: jugadores de los tiers pedidos. De cada uno saldrán sus partidas
// recientes; como cada partida trae 10 participantes, los roles salen
// balanceados solos.
async function seedPuuids() {
  const puuids = new Set();

  for (const tier of args.tiers.split(",").map((t) => t.trim().toUpperCase())) {
    const url = `https://${REGION}.api.riotgames.com/lol/league-exp/v4/entries/RANKED_SOLO_5x5/${tier}/${args.division}?page=1`;
    const entries = await riot(url);

    if (!entries?.length) {
      console.warn(`  sin entradas para ${tier} ${args.division}`);
      continue;
    }

    for (const entry of entries) {
      if (entry.puuid) puuids.add(JSON.stringify({ puuid: entry.puuid, tier }));
    }
    console.log(`  ${tier}: ${entries.length} jugadores`);
  }

  return [...puuids].map((s) => JSON.parse(s));
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
  console.log(`Parche actual: ${patch} — objetivo: ${TARGET} partidas (${REGION})`);

  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, CSV_COLUMNS.join(",") + "\n");

  console.log("Buscando jugadores semilla…");
  const seeds = await seedPuuids();
  if (!seeds.length) {
    console.error("No se consiguió ningún puuid semilla. ¿Tiers/región válidos?");
    process.exit(1);
  }
  console.log(`${seeds.length} jugadores semilla\n`);

  const seen = new Set();
  let collected = 0;
  let skippedOldPatch = 0;

  for (const seed of seeds) {
    if (collected >= TARGET) break;

    const ids = await riot(
      `https://${CLUSTER}.api.riotgames.com/lol/match/v5/matches/by-puuid/${seed.puuid}/ids`
        + `?queue=${QUEUE_ID}&start=0&count=10`
    );
    if (!ids?.length) continue;

    for (const id of ids) {
      if (collected >= TARGET) break;
      if (seen.has(id)) continue;
      seen.add(id);

      const match = await riot(`https://${CLUSTER}.api.riotgames.com/lol/match/v5/matches/${id}`);
      if (!match?.info?.participants) continue;

      // gameVersion es "15.14.678.9042": comparamos solo major.minor.
      if (!match.info.gameVersion?.startsWith(patch + ".")) {
        skippedOldPatch++;
        continue;
      }
      // Partidas remake (menos de 5 min) ensucian cualquier promedio.
      if (match.info.gameDuration < 300) continue;

      const lines = rowsFor(match, seed.tier, patch)
        .map((row) => row.map(csvCell).join(","))
        .join("\n");
      appendFileSync(args.out, lines + "\n");

      collected++;
      if (collected % 10 === 0) {
        console.log(`  ${collected}/${TARGET} partidas · ${requests} requests · ${skippedOldPatch} de parches viejos`);
      }
    }
  }

  console.log(`\nListo: ${collected} partidas (${collected * 10} filas) en ${args.out}`);
  console.log(`${requests} requests a Riot · ${skippedOldPatch} descartadas por parche viejo`);
}

main();
