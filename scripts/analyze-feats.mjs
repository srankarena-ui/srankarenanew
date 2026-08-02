// Mide cada cuánto ocurre de verdad cada gesta, sobre el JSONL de
// collect-challenges.mjs, y propone la clase de rareza que le corresponde.
//
//   node scripts/analyze-feats.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    in: { type: "string", default: "data/challenges.jsonl" },
    out: { type: "string", default: "data/feat-frequency.json" },
  },
});

const rows = readFileSync(args.in, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const N = rows.length;

// Ocurrencias por actuación individual. Se separa "en cuántas partidas pasó al
// menos una vez" de "cuántas veces en total": una gesta puede ser rara de ver
// pero acumularse mucho cuando aparece.
const stat = {};
for (const r of rows) {
  for (const [k, v] of Object.entries(r.c)) {
    (stat[k] ??= { games: 0, total: 0, byRole: {} });
    stat[k].games++;
    stat[k].total += v;
    stat[k].byRole[r.r] = (stat[k].byRole[r.r] ?? 0) + v;
  }
}

// Clase según ocurrencias medias por actuación.
// La última es cajón de sastre a propósito: algunas métricas son diferencias y
// pueden salir negativas (ventaja sobre el rival de línea, déficit de bajas).
// Esas no son gestas, pero no deben romper la clasificación.
const CLASSES = [
  ["comun",     1.0,        "Común"],
  ["frecuente", 0.3,        "Frecuente"],
  ["ocasional", 0.05,       "Ocasional"],
  ["raro",      0.01,       "Raro"],
  ["muyraro",   -Infinity,  "Muy raro"],
];
const classify = (perGame) => CLASSES.find(([, min]) => perGame >= min)[0];

// Lo que asigné a ojo en el catálogo, para ver dónde me equivoqué.
const GUESS = {
  epicMonsterStolenWithoutSmite:"muyraro", takedownsInEnemyFountain:"muyraro",
  soloBaronKills:"muyraro", twentyMinionsIn3SecondsCount:"raro",
  outnumberedNexusKill:"muyraro", dancedWithRiftHerald:"raro",
  survivedSingleDigitHpCount:"ocasional", hadOpenNexus:"raro",
  killedChampTookFullTeamDamageSurvived:"raro", tookLargeDamageSurvived:"ocasional",
  quickCleanse:"raro", survivedThreeImmobilizesInFight:"frecuente",
  soloKills:"frecuente", multikillsAfterAggressiveFlash:"raro",
  multiKillOneSpell:"raro", takedownsInAlcove:"ocasional",
  killAfterHiddenWithAlly:"frecuente", outnumberedKills:"ocasional",
  takedownsBeforeJungleMinionSpawn:"raro", killsNearEnemyTurret:"ocasional",
  twoWardsOneSweeperCount:"ocasional", unseenRecalls:"ocasional",
  wardsGuarded:"ocasional", moreEnemyJungleThanOpponent:"frecuente",
  wardTakedownsBefore20M:"comun", controlWardsPlaced:"comun",
  multiTurretRiftHeraldCount:"raro", kTurretsDestroyedBeforePlatesFall:"ocasional",
  elderDragonKillsWithOpposingSoul:"muyraro", soloTurretsLategame:"ocasional",
  epicMonsterKillsWithin30SecondsOfSpawn:"ocasional", buffsStolen:"frecuente",
  perfectGame:"muyraro", flawlessAces:"raro", doubleAces:"muyraro",
  mejaisFullStackInTime:"raro", legendaryCount:"frecuente", pentaKills:"muyraro",
};

const ROLES = ["TOP","JUNGLE","MIDDLE","BOTTOM","UTILITY"];
const out = {};
const report = [];

for (const [k, s] of Object.entries(stat)) {
  const perGame = s.total / N;
  const pct = (s.games / N) * 100;
  const real = classify(perGame);
  // Concentración por rol: si un solo rol acapara la gesta, no vale como logro
  // universal — sería inalcanzable para los otros cuatro.
  const top = ROLES.map((r) => [r, s.byRole[r] ?? 0]).sort((a, b) => b[1] - a[1])[0];
  const share = s.total > 0 ? (top[1] / s.total) * 100 : 0;

  out[k] = {
    perGame: Number(perGame.toFixed(4)),
    pctGames: Number(pct.toFixed(2)),
    oneInN: perGame > 0 ? Math.round(1 / perGame) : null,
    clase: real,
    rolDominante: top[0],
    concentracion: Number(share.toFixed(0)),
  };
  if (GUESS[k]) report.push({ k, real, guess: GUESS[k], ...out[k] });
}

writeFileSync(args.out, JSON.stringify({ sampleRows: N, feats: out }, null, 2));

const ORDER = ["comun","frecuente","ocasional","raro","muyraro"];
const LABEL = Object.fromEntries(CLASSES.map(([k,,l]) => [k, l]));
report.sort((a, b) => ORDER.indexOf(a.real) - ORDER.indexOf(b.real) || b.perGame - a.perGame);

console.log(`${N.toLocaleString("es-ES")} actuaciones analizadas\n`);
console.log("MÉTRICA                                  1 de cada   % part.  REAL         ESTIMADO      ROL DOM.");
for (const r of report) {
  const mark = r.real === r.guess ? " " : "≠";
  console.log(
    mark + " " + r.k.padEnd(40) +
    String(r.oneInN ?? "—").padStart(8) + "  " +
    String(r.pctGames).padStart(7) + "%  " +
    LABEL[r.real].padEnd(12) + LABEL[r.guess].padEnd(13) +
    (r.concentracion >= 50 ? `${r.rolDominante} ${r.concentracion}%` : "")
  );
}
const wrong = report.filter((r) => r.real !== r.guess).length;
console.log(`\n${wrong} de ${report.length} estimaciones estaban mal → ${args.out}`);
