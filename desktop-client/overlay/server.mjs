#!/usr/bin/env node
// Overlay de sesión para League of Legends: lee la Live Client Data API local
// (https://127.0.0.1:2999/liveclientdata/allgamedata, sin API key) y sirve un
// panel de control + un overlay para OBS. Cero dependencias externas.
//
// Uso:
//   node server.mjs         -> modo real, sondea tu cliente de League
//   node server.mjs --demo  -> partida simulada, para probar todo sin jugar
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO = process.argv.includes("--demo");
const PORT = 8787;

// Cuando corre embebido en la app de Electron, LOL_OVERLAY_DATA_DIR apunta a la carpeta
// de datos de usuario del sistema (una vez instalado, __dirname puede no ser escribible,
// ej. dentro de Archivos de Programa). Suelto (node server.mjs) sigue usando ./data.
const DATA_DIR = process.env.LOL_OVERLAY_DATA_DIR || path.join(__dirname, "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const CONFIG_PATH = path.join(DATA_DIR, "config.json");
const SESSION_PATH = path.join(DATA_DIR, "session.json");
const PUBLIC_DIR = path.join(__dirname, "public");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/**
 * Calibración del marco y el icono. Fija e igual para todos.
 *
 * Antes se ajustaba desde el panel, pero ya está decidida: se quitó esa sección
 * para que todos los streamers se vean igual. El servidor ignora lo que llegue
 * en `/config` y lo que quede guardado en disco de antes, o una configuración
 * vieja resucitaría valores distintos en la máquina de alguien.
 *
 * Los cuatro estilos comparten valores a propósito.
 */
const CALIBRACION = { size: 46, x: 72, y: 45, zoom: 100, borderX: 74, borderY: 45 };

const FIT_FIJO = Object.freeze({
  ranked: { ...CALIBRACION },
  prestige: { ...CALIBRACION },
  miniRanked: { ...CALIBRACION },
  miniPrestige: { ...CALIBRACION },
  linkMini: true,
  // Tamaño del conjunto completo marco+icono, en píxeles.
  frameBig: 130,
  frameMini: 219,
});

const DEFAULT_CONFIG = {
  riotApiKey: "", riotGameName: "", riotTagLine: "", riotPlatform: "na1",
  animStyle: "A", // A = Hextech (ensamble) | B = Impacto (golpe) | C = Energía (barrido)
  forceView: "auto", // auto (según vivo/muerto real) | dead (grande fija) | alive (mini fija)
  respawnStyle: "ring", // ring (círculo) | bar (barra) | plain (solo el número)
  numFont: "jetbrains", // jetbrains | space | orbitron | rajdhani | teko | bebas | chakra — tipografía de los números
  championSplash: false, // fondo con el splash art del campeón que estás jugando, en la tarjeta grande
  lang: "es", // es | en — idioma de las etiquetas fijas del overlay (no de los datos, que vienen de Riot)
  // Elementos del overlay, en dos niveles:
  //   widgets: bloques colocables -> { x, y, scale, on }. Se arrastran en la vista previa del panel.
  //   parts:   piezas dentro de un widget -> true/false. Solo se muestran u ocultan.
  // Los dos son mapas ABIERTOS: la clave ausente vale "visible y en su sitio". Agregar un elemento
  // nuevo es tocar public/widgets.js + el HTML, nunca este archivo.
  widgets: {},
  parts: {},
  editBgPath: null,   // captura del juego de fondo — SOLO en la vista previa del panel, jamás en OBS
  editShowAll: false, // mientras editas: mostrar todo junto aunque no esté pasando en la partida
  // Bot de chat: el canal de Kick del que se leen los comandos (solo el slug, kick.com/<slug>).
  kickChannel: "",
  kickChatroomId: null,   // id de chat resuelto, para no volver a pedirlo en cada arranque
  kickChatroomSlug: null, // a qué canal pertenece ese id (sin esto, cambiar de canal heredaría el viejo)
  // Winrate de enfrentamiento (datos de u.gg, ver el bloque de arriba)
  uggEnabled: true,
  uggRank: "overall",     // overall | platinum_plus | emerald_plus | diamond_plus | master_plus
  uggRegion: "world",     // world = global. Es lo que tiene muestra de verdad: en una región chica
                          // muchos enfrentamientos se quedan en 2-20 partidas y no dicen nada.
  vsStyle: "c",           // a = diagonal | b = corte recto | c = fundido
  vsFont: "teko",           // tipografía de los nombres
  vsInfoFont: "rajdhani",  // tipografía de la barra de datos
  // El duelo no lo pide el chat: sale solo al empezar la partida, en esta ventana (segundos de juego).
  vsFrom: 5,
  vsTo: 25,         // tipografía de los nombres de campeón en la tarjeta de duelo           // a = diagonal centrada | b = corte recto | c = diagonal sin insignia arriba
  uggMinGames: 50,        // por debajo de esto el dato no dice nada y no se muestra
  cmdDurationMs: 10000, // cuánto se queda un panel de comando en pantalla
  cmdCooldownMs: 60000, // cuánto hay que esperar para volver a pedir el mismo comando
  iconFit: FIT_FIJO,
};
const DEFAULT_SESSION = { wins: 0, losses: 0, deadTimeTodaySec: 0 };

function loadJSON(p, fallback) {
  try { return { ...fallback, ...JSON.parse(fs.readFileSync(p, "utf8")) }; }
  catch { return { ...fallback }; }
}
function saveJSON(p, data) { fs.writeFileSync(p, JSON.stringify(data, null, 2)); }

// Merge de un nivel más: en { dead:{x,y}, alive:{...} } combina cada sub-objeto en vez de pisarlo,
// para que un patch parcial ({ dead:{x:10} }) no borre el resto de las claves.
function mergeDeep2(base, patch) {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch || {})) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) ? { ...base?.[k], ...v } : v;
  }
  return out;
}

let config = loadJSON(CONFIG_PATH, DEFAULT_CONFIG);
// loadJSON solo combina claves de primer nivel; iconFit.ranked/prestige necesitan
// su propio merge para que un config.json viejo no pierda campos nuevos (ej. borderX/Y).
// Se impone la calibración fija: un config.json antiguo no debe devolver
// valores distintos en la máquina de un streamer.
config.iconFit = FIT_FIJO;
// migración: la calibración vieja vivía en cardPos {dead,alive}; ahora es un widget más del registro.
if (config.cardPos && !config.widgets?.dead) {
  config.widgets = mergeDeep2({ dead: config.cardPos.dead, alive: config.cardPos.alive }, config.widgets);
}
delete config.cardPos;
config.widgets = config.widgets || {};
config.parts = config.parts || {};
let session = loadJSON(SESSION_PATH, DEFAULT_SESSION);

// ---------- tracker: estado puro (con auto-test más abajo) ----------

const DRAGON_LABEL = { Fire: "Infernal", Earth: "Montaña", Water: "Océano", Air: "Nube", Hextech: "Hextech", Chemtech: "Chemtech", Elder: "Ancestral" };
const MULTIKILL_LABEL = { 2: "¡Doble Kill!", 3: "¡Triple Kill!", 4: "¡Cuádruple Kill!", 5: "¡Pentakill!" };

function createTracker() {
  return {
    inGame: false,
    championName: null,
    lastKills: 0, lastDeaths: 0, lastAssists: 0,
    wasDead: false, deathStartGameTime: null, gameDeadTimeSec: 0, respawnTimer: 0,
    lastGameTime: 0, creepScore: 0,
    killFlashAt: 0,
    gameEnded: false, // se puso "no en partida" viniendo de "en partida" — dispara la verificación por API
    killStreak: 0,
    myTeam: null,
    fullRunes: null,  // se fija una vez al entrar a la partida: las runas no cambian durante el juego
    comp: null,       // idem: campeones y árboles de runas de los 10, tampoco cambian
    myPosition: null, // TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY si el cliente lo da (a veces viene vacío)
    ownedItemIds: {}, // itemID -> true, para detectar compras nuevas por diff
    itemLog: [], // [{itemID, displayName, atGameTime}] — items completos, en orden de compra
    seenEventCount: 0,
    firstBloodTag: null, // {mine, at} — se fija una sola vez, al primer ChampionKill de la partida
    multikillTag: null, // {text, at}
    aceTag: null, // {mine, at}
    objectives: { towers: 0, heralds: 0, barons: 0 },
    dragons: {},
  };
}

// Composición: lo único que se guarda de cada jugador es su campeón, su equipo y los tres ids de
// runa que la Live Client API da de los demás (keystone + los dos árboles). Nada de nombres de
// invocador: el campeón se entiende mejor y así no hay ni que pensar en las reglas de nombres.
function extractComp(allPlayers, myTeam) {
  const pick = (r) => (r ? { id: r.id, name: r.displayName || "" } : null);
  return (allPlayers || []).map((p) => ({
    champion: p.championName || "",
    mine: p.team === myTeam,
    position: p.position || "", // TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY — verificado: llega de los diez
    skin: Number(p.skinID) || 0, // para enseñar el arte de la skin que lleva puesta, no la default
    keystone: pick(p.runes?.keystone),
    primary: pick(p.runes?.primaryRuneTree),
    secondary: pick(p.runes?.secondaryRuneTree),
  }));
}

function teamOf(data, summonerName) {
  return (data.allPlayers || []).find((p) => p.summonerName === summonerName)?.team ?? null;
}

// El resultado real (ganada/perdida) y si fue ranked no salen de aquí: la Live Client Data API no
// los da de forma confiable. Esto solo marca "la partida que veníamos siguiendo ya terminó", y quien
// decide si cuenta es checkPendingRankedResult() contra la API de Riot (ver más abajo).
function applySnapshot(tr, data, nowMs) {
  if (!data) {
    if (tr.inGame) return { ...tr, inGame: false, gameEnded: true };
    return tr;
  }

  const me = (data.allPlayers || []).find((p) => p.summonerName === data.activePlayer?.summonerName);
  if (!me) return tr;

  const gameTime = data.gameData?.gameTime ?? tr.lastGameTime;
  let t = tr.inGame ? { ...tr } : {
    ...createTracker(),
    lastKills: me.scores.kills, lastDeaths: me.scores.deaths, lastAssists: me.scores.assists,
    wasDead: me.isDead, deathStartGameTime: me.isDead ? gameTime : null,
    myTeam: me.team,
  };
  t.inGame = true;
  t.lastGameTime = gameTime;
  t.creepScore = me.scores.creepScore ?? 0;
  t.myTeam = t.myTeam ?? me.team;
  t.championName = me.championName ?? t.championName;
  // las runas son inmutables durante la partida: se cachean la primera vez que llegan y no se vuelven a mirar
  t.fullRunes = t.fullRunes ?? data.activePlayer?.fullRunes ?? null;
  // la composición igual, pero se espera a que el cliente traiga las runas de los demás: en los
  // primeros segundos de partida allPlayers ya existe y runes todavía no, y quedaría cacheada vacía.
  if (!t.comp && (data.allPlayers || []).some((p) => p.runes?.keystone?.id)) t.comp = extractComp(data.allPlayers, me.team);
  t.myPosition = t.myPosition || me.position || null;

  t.lastKills = me.scores.kills; t.lastDeaths = me.scores.deaths; t.lastAssists = me.scores.assists;

  if (me.isDead && !t.wasDead) t.deathStartGameTime = gameTime;
  if (!me.isDead && t.wasDead && t.deathStartGameTime != null) {
    t.gameDeadTimeSec += Math.max(0, gameTime - t.deathStartGameTime);
    t.deathStartGameTime = null;
  }
  t.wasDead = me.isDead;
  t.respawnTimer = me.isDead ? Math.max(0, me.respawnTimer ?? 0) : 0;

  const allEvents = data.events?.Events ?? [];
  const newEvents = allEvents.slice(t.seenEventCount);
  t.seenEventCount = allEvents.length;

  for (const e of newEvents) {
    if (e.EventName === "ChampionKill") {
      if (!t.firstBloodTag) t.firstBloodTag = { mine: e.KillerName === me.summonerName, at: nowMs };
      if (e.KillerName === me.summonerName) { t.killFlashAt = nowMs; t.killStreak++; }
      if (e.VictimName === me.summonerName) t.killStreak = 0;
    }
    // se queda la mejor racha de multikill de la partida, un Doble Kill después no pisa un Pentakill anterior
    if (e.EventName === "Multikill" && e.KillerName === me.summonerName && e.KillStreak > (t.multikillTag?.streak ?? 0)) {
      t.multikillTag = { streak: e.KillStreak, text: MULTIKILL_LABEL[e.KillStreak] ?? `¡Multikill x${e.KillStreak}!`, at: nowMs };
    }
    if (e.EventName === "Ace") {
      t.aceTag = { mine: e.AcingTeam === t.myTeam, at: nowMs };
    }
    if (e.EventName === "TurretKilled" && teamOf(data, e.KillerName) === t.myTeam) t.objectives = { ...t.objectives, towers: t.objectives.towers + 1 };
    if (e.EventName === "HeraldKill" && teamOf(data, e.KillerName) === t.myTeam) t.objectives = { ...t.objectives, heralds: t.objectives.heralds + 1 };
    if (e.EventName === "BaronKill" && teamOf(data, e.KillerName) === t.myTeam) t.objectives = { ...t.objectives, barons: t.objectives.barons + 1 };
    if (e.EventName === "DragonKill" && teamOf(data, e.KillerName) === t.myTeam) {
      const label = DRAGON_LABEL[e.DragonType] ?? e.DragonType;
      t.dragons = { ...t.dragons, [label]: (t.dragons[label] ?? 0) + 1 };
    }
  }

  // items: se detectan por diff contra lo que ya tenías (la Live Client Data API no da eventos de
  // compra, solo el inventario actual) — cada itemID nuevo (completo o componente) queda en el log
  // con el momento de partida en que apareció.
  if (Array.isArray(me.items)) {
    const prevOwned = t.ownedItemIds;
    const nextOwned = {};
    for (const it of me.items) {
      nextOwned[it.itemID] = true;
      if (!prevOwned[it.itemID]) {
        t.itemLog = [...t.itemLog, { itemID: it.itemID, displayName: it.displayName, atGameTime: gameTime }];
      }
    }
    t.ownedItemIds = nextOwned;
  }

  return t;
}

function currentDeadTimeSec(tr) {
  if (!tr.inGame) return 0;
  const ongoing = tr.wasDead && tr.deathStartGameTime != null ? Math.max(0, tr.lastGameTime - tr.deathStartGameTime) : 0;
  return tr.gameDeadTimeSec + ongoing;
}

function commitResult(sess, deadTimeSec, result) {
  const s = { ...sess, deadTimeTodaySec: sess.deadTimeTodaySec + deadTimeSec };
  if (result === "Win") s.wins++; else if (result === "Lose") s.losses++;
  return s;
}

// ---------- rango (API pública de Riot, opcional) -------------------------

const PLATFORM_TO_REGIONAL = {
  na1: "americas", br1: "americas", la1: "americas", la2: "americas", oc1: "americas",
  euw1: "europe", eun1: "europe", tr1: "europe", ru: "europe",
  kr: "asia", jp1: "asia",
  ph2: "sea", sg2: "sea", th2: "sea", tw2: "sea", vn2: "sea",
};

function emblemUrl(tier) {
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${tier}.png`;
}

// Master/Grandmaster/Challenger no tienen división (I-IV); el resto sí.
function normalizeRankEntry(entry) {
  if (!entry) return { tier: null, division: null, lp: null };
  const tier = entry.tier.toLowerCase();
  const hidesDivision = tier === "master" || tier === "grandmaster" || tier === "challenger";
  return { tier, division: hidesDivision ? null : entry.rank, lp: entry.leaguePoints };
}

// Dónde escucha el cliente de S-Rank Arena. Lo pasa él al arrancar este
// proceso; si no está, se cae al puerto de siempre.
const SRANK_LOCAL = process.env.SRANK_LOCAL ?? "http://127.0.0.1:8788";

/**
 * Todas las llamadas a la API de Riot pasan por aquí, y por eso basta con
 * cambiar esta función: van a través del cliente, que las reenvía a la web,
 * que es la única que tiene la clave.
 *
 * Antes cada streamer metía su propia clave de desarrollador en el panel, y esa
 * caduca cada 24 horas. Mandarle a cada uno la clave de la plataforma tampoco
 * valía: es una sola para todos, y repartida por veinte máquinas cualquiera
 * podría quemar el límite o filtrarla.
 *
 * Data Dragon y Community Dragon siguen yendo directos: son públicos y no
 * llevan clave.
 */
async function riotGet(url, _apiKey) {
  const esRiot = /^https:\/\/[a-z0-9-]+\.api\.riotgames\.com\//.test(url);
  const destino = esRiot
    ? `${SRANK_LOCAL}/local/riot?url=${encodeURIComponent(url)}`
    : url;

  try {
    const res = await fetch(destino);
    if (!res.ok) return { error: `${res.status} ${res.statusText}` };
    return { data: await res.json() };
  } catch (e) { return { error: e.message }; }
}

function profileIconUrl(version, iconId) {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${iconId}.png`;
}

// challenges-v1 devuelve el título equipado como código numérico (ej. 30110005), no texto.
// Community Dragon tiene el catálogo público de títulos con ese mismo número en "itemId".
function findTitleName(titles, itemId) {
  return titles.find((t) => t.itemId === itemId)?.titleName ?? null;
}

let titleCatalog = null;
async function getTitleCatalog() {
  if (!titleCatalog) {
    const r = await riotGet("https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/achievementtitles.json", "");
    titleCatalog = r.data || [];
  }
  return titleCatalog;
}

// Borde de prestigio: te quedas con el nivel más alto ya alcanzado hasta el próximo hito.
const BORDER_LEVELS = [1, 30, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500];
function prestigeBorderFile(level) {
  const match = [...BORDER_LEVELS].reverse().find((l) => l <= level) ?? BORDER_LEVELS[0];
  return `/borders/level-${match}.png`;
}

// Borde de rango, por tier. Cuál de este o el de prestigio se termina mostrando lo decide
// crestBorder (ver fetchRank) — no una suposición nuestra.
function rankBorderFile(tier) {
  return tier ? `/borders/rank/${tier}.png` : null;
}

const DEFAULT_RANK = { tier: null, division: null, lp: null, profileIconUrl: null, title: null, prestigeBorderUrl: null, rankBorderUrl: null, error: null };
let rank = { ...DEFAULT_RANK };

async function fetchRank() {
  const { riotApiKey: key, riotGameName: name, riotTagLine: tag, riotPlatform: platform } = config;
  if (!name || !tag) return;
  const regional = PLATFORM_TO_REGIONAL[platform] || "americas";

  const acc = await riotGet(`https://${regional}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, key);
  if (acc.error) { rank = { ...DEFAULT_RANK, error: `Riot ID no encontrado (${acc.error})` }; return; }
  const puuid = acc.data.puuid;

  const summ = await riotGet(`https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`, key);
  if (summ.error) { rank = { ...DEFAULT_RANK, error: `Clave inválida o expirada (${summ.error})` }; return; }
  const version = await getDdragonVersion();
  const iconUrl = profileIconUrl(version, summ.data.profileIconId);

  // ponytail: no confirmé si esta versión de league-v4 ya soporta by-puuid directo;
  // si falla, cae al camino clásico by-summoner (que sí es estable).
  let entries = await riotGet(`https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`, key);
  if (entries.error) {
    entries = await riotGet(`https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summ.data.id}`, key);
    if (entries.error) { rank = { ...DEFAULT_RANK, profileIconUrl: iconUrl, error: `Error consultando rango (${entries.error})` }; return; }
  }

  // ponytail: el título equipado es "best effort" vía challenges-v1 — si el endpoint
  // falla (o el jugador no tiene título), simplemente no se muestra, no rompe el resto.
  const challenges = await riotGet(`https://${platform}.api.riotgames.com/lol/challenges/v1/player-data/${puuid}`, key);
  const titleCode = challenges.data?.preferences?.title;
  const title = titleCode ? findTitleName(await getTitleCatalog(), Number(titleCode)) : null;
  const prestigeBorderUrl = prestigeBorderFile(challenges.data?.preferences?.prestigeCrestBorderLevel ?? 0);
  // "2" = el jugador eligió mostrar el borde de rango en su cliente, "1" (o cualquier otro valor)
  // = eligió el de nivel/prestigio — es la preferencia real del jugador, no una suposición nuestra
  // en base a si tiene rango o no (un Oro I puede preferir mostrar su borde de nivel igual).
  const crestBorder = challenges.data?.preferences?.crestBorder ?? null;

  const list = entries.data || [];
  const queue = list.find((e) => e.queueType === "RANKED_SOLO_5x5") || list.find((e) => e.queueType === "RANKED_FLEX_SR");
  const extra = { profileIconUrl: iconUrl, title, prestigeBorderUrl, crestBorder, rankBorderUrl: rankBorderFile(queue?.tier?.toLowerCase()) };
  rank = queue
    ? { ...normalizeRankEntry(queue), ...extra, error: null }
    : { ...DEFAULT_RANK, ...extra, error: "Sin partidas clasificatorias en Solo/Duo ni Flex" };
}

// ---------- partidas anteriores (match-v5, opcional) -----------------------

let ddragonVersion = null;
async function getDdragonVersion() {
  if (ddragonVersion) return ddragonVersion;
  const r = await riotGet("https://ddragon.leagueoflegends.com/api/versions.json", "");
  ddragonVersion = r.data?.[0] ?? "14.10.1";
  return ddragonVersion;
}

// El nombre que da la Live Client Data API es el de vitrina ("Miss Fortune", "Kai'Sa"), no el id
// interno que usan las URLs de arte ("MissFortune", "Kaisa") — y ese mapeo no es un patrón regular
// (Wukong -> MonkeyKing, Kai'Sa -> Kaisa con minúscula, Kog'Maw -> KogMaw con mayúscula...), así
// que se resuelve con el propio champion.json de Riot en vez de adivinar reglas.
// Se indexa por el nombre en inglés Y en español, porque el cliente devuelve el nombre en su propio
// idioma: con un cliente en español, "Sanador de almas" no aparecería en el catálogo en inglés y se
// quedaría sin icono. Cada entrada trae el id de las URLs ("MissFortune") y la clave numérica, que
// es la que usa u.gg.
// Se descartan las variantes de League Classic (ids 60000+, "Jade_Amumu" y compañía): comparten el
// nombre visible con el campeón normal, así que si entran al mapa lo pisan y todo lo que se busque
// por nombre acaba apuntando al id equivocado — icono roto y 403 en u.gg.
const CLASSIC_KEY_MIN = 60000;
function buildChampionCatalog(dataSets) {
  const cat = {};
  for (const data of dataSets) {
    for (const c of Object.values(data || {})) {
      if (Number(c.key) >= CLASSIC_KEY_MIN) continue;
      cat[c.name] = { id: c.id, key: Number(c.key) };
    }
  }
  return cat;
}

let championCatalog = null;
async function getChampionCatalog() {
  if (!championCatalog) {
    const version = await getDdragonVersion();
    const res = await Promise.all(["en_US", "es_ES"].map((lang) =>
      riotGet(`https://ddragon.leagueoflegends.com/cdn/${version}/data/${lang}/champion.json`, "")));
    championCatalog = buildChampionCatalog(res.map((r) => r.data?.data));
  }
  return championCatalog;
}

async function championSplashUrl(displayName) {
  if (!displayName) return null;
  const catalog = await getChampionCatalog();
  const id = catalog[displayName]?.id;
  if (!id) return null;
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/centered/${CENTERED_ID_OVERRIDE[id] || id}_0.jpg`;
}
function championIconUrl(version, championName) {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championName}.png`;
}

function itemIconUrl(version, itemID) {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemID}.png`;
}

// ---------- runas: catálogo de iconos (los nombres ya vienen del cliente) ------------------
//
// Dos fuentes, porque ninguna sola las tiene todas:
//   runesReforged.json (DDragon) -> las 60+ runas y los 5 árboles.
//   perks.json (Community Dragon) -> los fragmentos/shards (ids 5001-5013), que NO están en DDragon.
// Trampa confirmada: los iconos de DDragon van SIN la versión en la ruta. Con versión da 403.
const DDRAGON_PERK_IMG = "https://ddragon.leagueoflegends.com/cdn/img/";
const CDRAGON_BASE = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default";

function buildRuneIconMap(runesReforged, cdragonPerks) {
  const map = {};
  for (const tree of runesReforged || []) {
    map[tree.id] = DDRAGON_PERK_IMG + tree.icon;
    for (const slot of tree.slots || []) {
      for (const rune of slot.runes || []) map[rune.id] = DDRAGON_PERK_IMG + rune.icon;
    }
  }
  // iconPath viene como "/lol-game-data/assets/v1/..." y el CDN lo sirve en minúsculas bajo otra raíz
  for (const p of cdragonPerks || []) {
    if (p.id >= 5000 && p.id < 6000 && p.iconPath) {
      map[p.id] = CDRAGON_BASE + p.iconPath.replace("/lol-game-data/assets", "").toLowerCase();
    }
  }
  return map;
}

// Página de runas de mentira, con la misma forma que da el cliente, para colocar el panel en el
// editor sin tener una partida abierta. Los nombres van en español porque es lo que devolvería
// un cliente en español; los iconos los resuelve el mismo mapa que las reales.
const DEMO_FULL_RUNES = {
  keystone: { id: 8112, displayName: "Electrocutar" },
  primaryRuneTree: { id: 8100, displayName: "Dominación" },
  secondaryRuneTree: { id: 8200, displayName: "Brujería" },
  generalRunes: [
    { id: 8112, displayName: "Electrocutar" }, { id: 8126, displayName: "Golpe bajo" },
    { id: 8137, displayName: "Sexto sentido" }, { id: 8106, displayName: "Cazador definitivo" },
    { id: 8210, displayName: "Trascendencia" }, { id: 8237, displayName: "Piroláser" },
  ],
  statRunes: [{ id: 5008, rawDescription: "Fuerza adaptativa" }, { id: 5008, rawDescription: "Fuerza adaptativa" }, { id: 5011, rawDescription: "Vida" }],
};

// Composición de mentira para colocar el panel sin partida. Mismos ids reales, así los iconos
// que salen en el editor son exactamente los que se verán en vivo.
const DEMO_COMP = [
  ["Miss Fortune", true, 8021, 8000, 8100], ["Leona", true, 8465, 8400, 8300],
  ["Ahri", true, 8112, 8100, 8200], ["Lee Sin", true, 8010, 8000, 8400],
  ["Darius", true, 8437, 8400, 8000],
  ["Jinx", false, 8008, 8000, 8200], ["Thresh", false, 8439, 8400, 8300],
  ["Syndra", false, 8214, 8200, 8300], ["Vi", false, 8010, 8000, 8100],
  ["Sett", false, 8010, 8000, 8400],
].map(([champion, mine, ks, pri, sec]) => ({
  champion, mine, keystone: { id: ks, name: "" }, primary: { id: pri, name: "" }, secondary: { id: sec, name: "" },
}));

// Añade los iconos (campeón y runas) a lo capturado. Los nombres de campeón que da el cliente son
// de vitrina ("Miss Fortune") y las URLs usan el id interno ("MissFortune"): lo resuelve el catálogo.
function shapeComp(comp, icons, catalog, version) {
  if (!comp) return null;
  const ic = (r) => (r ? { name: r.name, iconUrl: icons[r.id] || null } : null);
  return comp.map((p) => ({
    champion: p.champion,
    mine: p.mine,
    championIconUrl: catalog[p.champion] ? championIconUrl(version, catalog[p.champion].id) : null,
    keystone: ic(p.keystone), primary: ic(p.primary), secondary: ic(p.secondary),
  }));
}

// Build de ejemplo, con ids de ítem reales, para el mismo caso.
const DEMO_ITEM_LOG = [
  { itemID: "3089", displayName: "Sombrero mortal de Rabadon", atGameTime: 8 * 60 + 40 },
  { itemID: "6653", displayName: "Tormento de Liandry", atGameTime: 15 * 60 + 10 },
  { itemID: "3157", displayName: "Reloj de arena de Zhonya", atGameTime: 21 * 60 + 5 },
];

function shapeItemLog(log, version) {
  return (log || []).map((it) => ({ ...it, atStr: fmtTime(it.atGameTime), iconUrl: itemIconUrl(version, it.itemID) }));
}

let runeIcons = null;
async function getRuneIcons() {
  if (!runeIcons) {
    const version = await getDdragonVersion();
    const [rr, cd] = await Promise.all([
      riotGet(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/runesReforged.json`, ""),
      riotGet(`${CDRAGON_BASE}/v1/perks.json`, ""),
    ]);
    // si alguna fuente falla se arma con la que respondió; el panel muestra el hueco, no rompe
    runeIcons = buildRuneIconMap(rr.data, cd.data);
  }
  return runeIcons;
}

// Aplana el fullRunes del cliente (nombres ya traducidos) al payload que dibuja el overlay.
// generalRunes[0] es siempre la keystone; 1-3 el árbol primario, 4-5 el secundario.
function shapeRunes(fullRunes, icons) {
  if (!fullRunes) return null;
  const one = (r) => (r ? { id: r.id, name: r.displayName || r.name || "", iconUrl: icons[r.id] || null } : null);
  const general = fullRunes.generalRunes || [];
  return {
    keystone: one(fullRunes.keystone || general[0]),
    primaryTree: one(fullRunes.primaryRuneTree),
    secondaryTree: one(fullRunes.secondaryRuneTree),
    perks: general.slice(1).map(one),
    shards: (fullRunes.statRunes || []).map((s) => ({ id: s.id, name: s.rawDescription || "", iconUrl: icons[s.id] || null })),
  };
}

// ---------- Kick ----------------------------------------------------------
//
// Para suscribirse al chat hace falta el id numérico del chatroom, y solo lo da la API REST de Kick,
// que está detrás de Cloudflare. Comprobado: fetch de Node -> 403, node:https -> 403 (da igual el
// user-agent, las cabeceras o los ciphers: distingue por huella TLS), y hasta un Chromium headless
// se queda sin respuesta. curl sí pasa, y viene de fábrica en Windows 10+, macOS y casi todo Linux.
// Por eso esto sale por curl y no por fetch. El id no cambia nunca: se resuelve y queda guardado.
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// El slug entra en un argv (no en una shell) y además se limita al alfabeto real de los nombres de
// canal de Kick, así que no hay forma de que se cuele nada raro desde el panel.
// Se corta en el primer carácter que no sea de un slug en vez de ir borrando los inválidos: así
// "kick.com/xqc?ref=1" da "xqc" y no "xqcref1", que fallaría con un error que no dice nada.
const cleanSlug = (raw) => ((raw || "").trim().toLowerCase().replace(/^.*kick\.com\//, "").match(/^[a-z0-9_-]+/) || [""])[0];

function curlJson(url, timeoutSec = 15) {
  return new Promise((resolve) => {
    execFile("curl", ["-s", "-S", "--compressed", "--max-time", String(timeoutSec), "-w", "\n%{http_code}",
      "-H", `User-Agent: ${BROWSER_UA}`, "-H", "Accept: application/json", url],
      { maxBuffer: 32_000_000 }, // los ficheros de enfrentamientos de u.gg rondan los 2,5 MB
      (err, stdout) => {
        if (err) return resolve({ status: 0, data: null }); // curl no existe o falló la red
        const cut = stdout.lastIndexOf("\n");
        const status = Number(stdout.slice(cut + 1).trim());
        try { return resolve({ status, data: JSON.parse(stdout.slice(0, cut)) }); }
        catch { return resolve({ status, data: null }); }
      });
  });
}

let kick = { slug: "", chatroomId: null, error: null };

async function resolveKickChannel() {
  const slug = cleanSlug(config.kickChannel);
  if (!slug) { kick = { slug: "", chatroomId: null, error: null }; return; }
  if (kick.slug === slug && kick.chatroomId) return; // ya resuelto en esta ejecución

  // El id guardado solo vale si es de ESTE canal — por eso se guarda junto al slug al que pertenece.
  // Así un arranque sin internet sigue funcionando, pero cambiar de canal nunca hereda el id viejo.
  if (config.kickChatroomSlug === slug && config.kickChatroomId) {
    kick = { slug, chatroomId: config.kickChatroomId, error: null };
    return;
  }

  const { status, data } = await curlJson(`https://kick.com/api/v2/channels/${slug}`);
  if (status === 200 && data?.chatroom?.id) {
    kick = { slug, chatroomId: data.chatroom.id, error: null };
    config.kickChatroomId = kick.chatroomId;
    config.kickChatroomSlug = slug;
    saveJSON(CONFIG_PATH, config);
    return;
  }
  kick = { slug, chatroomId: null, error:
    status === 404 ? `El canal "${slug}" no existe en Kick`
    : status === 0 ? "No se pudo contactar con Kick (¿sin internet, o falta curl en el sistema?)"
    : status === 200 ? "Kick no devolvió el chat de ese canal"
    : `Kick respondió ${status}` };
}

// ---------- u.gg: winrate de enfrentamiento -------------------------------
//
// Fuente NO documentada (ver notas al final del bloque). El fichero es del campeón que juegas y
// trae los enfrentamientos contra todos los demás, así que basta una descarga (~2,5 MB) por partida.
//   https://stats2.u.gg/lol/1.5/matchups/{parche}/{cola}/{idCampeon}/1.5.0.json
//   estructura: [region][rango][rol] -> [ [filas], fecha ]
//   fila:       [ idRival, victorias, partidas, ...12 campos de deltas que no usamos ]
// Los códigos salen de los propios enums de u.gg, y están verificados contra su web.
const UGG_ROLE = { TOP: 4, JUNGLE: 1, MIDDLE: 5, BOTTOM: 3, UTILITY: 2 };
const UGG_RANK = { overall: 8, platinum_plus: 10, emerald_plus: 17, diamond_plus: 11, master_plus: 14 };
const UGG_REGION = { na1: 1, euw1: 2, kr: 3, eun1: 4, br1: 5, la1: 6, la2: 7, oc1: 8, ru: 9, tr1: 10, jp1: 11, world: 12, ph2: 13, sg2: 14, th2: 15, tw2: 16, vn2: 17 };

// La nota de letra y su color son los mismos umbrales que usa u.gg, para que el panel se lea igual
// que su web y no me invente una escala propia.
function uggTier(wr) {
  if (wr < 45) return { tier: "D", color: "#FF4E50" };
  if (wr < 48.5) return { tier: "C", color: "#FCB1B2" };
  if (wr < 51.5) return { tier: "B", color: "#FFFFFF" };
  if (wr < 53) return { tier: "A", color: "#7EA4F4" };
  if (wr < 55) return { tier: "S", color: "#3273FA" };
  return { tier: "S+", color: "#FF9B00" };
}

// "16.14.1" -> "16_14" (misma conversión que hace u.gg en su patch-helpers)
const normalizePatch = (p) => { const s = String(p).split(/[_.]/); return s.length >= 2 ? `${s[0]}_${s[1]}` : String(p); };

// u.gg publica el parche ya cerrado, así que el que está en vivo suele dar 403: se prueba el actual
// y se va hacia atrás hasta encontrar uno que responda.
let uggPatch = null;
async function getUggPatch() {
  if (uggPatch) return uggPatch;
  const [maj, min] = normalizePatch(await getDdragonVersion()).split("_").map(Number);
  for (let i = 0; i < 4; i++) {
    const p = min - i > 0 ? `${maj}_${min - i}` : `${maj - 1}_${24 - i}`;
    const { status } = await curlJson(`https://stats2.u.gg/lol/1.5/matchups/${p}/ranked_solo_5x5/1/1.5.0.json`, 20);
    if (status === 200) { uggPatch = p; return p; }
  }
  return null;
}

// Caché en disco: el fichero es grande y el parche solo cambia cada dos semanas.
const UGG_DIR = path.join(DATA_DIR, "ugg");
async function getUggMatchups(championKey) {
  const patch = await getUggPatch();
  if (!patch) throw new Error("u.gg no respondió a ningún parche reciente");
  const file = path.join(UGG_DIR, `${patch}-${championKey}.json`);
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch {}

  const url = `https://stats2.u.gg/lol/1.5/matchups/${patch}/ranked_solo_5x5/${championKey}/1.5.0.json`;
  // dos intentos: pedir varios ficheros de 2-3 MB seguidos falla de vez en cuando, y un solo
  // reintento a los 2 s lo resuelve sin montar una política de reintentos entera
  let last = null;
  for (let i = 0; i < 2; i++) {
    if (i) await new Promise((r) => setTimeout(r, 2000));
    last = await curlJson(url, 45);
    if (last.status === 200 && last.data) {
      fs.mkdirSync(UGG_DIR, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(last.data));
      return last.data;
    }
  }
  throw new Error(`u.gg respondió ${last.status || "nada"} al pedir el campeón ${championKey} (parche ${patch})`);
}

// Si el cliente no dice tu posición (pasa en varias colas), se deduce: el rol donde ese campeón
// acumula más partidas es el suyo. Mejor que pedírselo al usuario y acertar casi siempre.
function guessRole(matchups) {
  const total = {};
  for (const r of Object.keys(matchups)) for (const t of Object.keys(matchups[r])) for (const ro of Object.keys(matchups[r][t])) {
    for (const f of matchups[r][t][ro]?.[0] || []) total[ro] = (total[ro] || 0) + f[2];
  }
  const top = Object.entries(total).sort((a, b) => b[1] - a[1])[0];
  return top ? Number(top[0]) : UGG_ROLE.MIDDLE;
}

// Función pura: saca la fila de un rival concreto del bloque región/rango/rol elegido.
function findMatchup(matchups, region, rank, role, enemyKey) {
  const filas = matchups?.[region]?.[rank]?.[role]?.[0] || [];
  const f = filas.find((x) => x[0] === enemyKey);
  if (!f || !f[2]) return null;
  const wr = (100 * f[1]) / f[2];
  return { wins: f[1], games: f[2], wr, ...uggTier(wr) };
}

// Arte del campeón con la skin puesta. Los cromas no tienen arte propio (dan 403), así que el
// overlay cae a la skin base si la imagen no carga — ver el onerror en renderMatchups().
// ponytail: excepción real de ddragon confirmada con curl — la carpeta "centered" quedó con el id
// viejo de antes del rework (con "S" mayúscula) aunque champion.json ya diga "Fiddlesticks" en todos
// lados. Es la única excepción documentada; si aparece otra, se agrega aquí.
const CENTERED_ID_OVERRIDE = { Fiddlesticks: "FiddleSticks" };
const centeredArt = (id, skin) => `https://ddragon.leagueoflegends.com/cdn/img/champion/centered/${CENTERED_ID_OVERRIDE[id] || id}_${Number(skin) || 0}.jpg`;

// Duelo de ejemplo para colocar el panel sin partida (cifras reales: Rengar vs Kha'Zix en jungla).
const DEMO_MATCHUPS = (() => {
  const wr = 47.61, games = 7747;

  return {
    role: UGG_ROLE.JUNGLE,
    roleIconUrl: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/svg/position-jungle.svg",
    me: { champion: "Amumu", splashUrl: centeredArt("Amumu", 1) },
    enemy: { champion: "Jax", splashUrl: centeredArt("Jax", 4) },
    wins: Math.round((wr * games) / 100), games, wr, delta: wr - 50, ...uggTier(wr),
    get vsStyle() { return config.vsStyle; },
  };
})();

// Función pura: dado un match-v5 completo y tu puuid, resume tu participación.
function summarizeParticipant(match, puuid) {
  const p = (match?.info?.participants || []).find((x) => x.puuid === puuid);
  if (!p) return null;
  return { championName: p.championName, win: p.win, kills: p.kills, deaths: p.deaths, assists: p.assists };
}

let matchHistory = [];

async function fetchMatchHistory() {
  const { riotApiKey: key, riotGameName: name, riotTagLine: tag, riotPlatform: platform } = config;
  if (!name || !tag) return;
  const regional = PLATFORM_TO_REGIONAL[platform] || "americas";

  const acc = await riotGet(`https://${regional}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, key);
  if (acc.error) return;
  const puuid = acc.data.puuid;

  const ids = await riotGet(`https://${regional}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=5`, key);
  if (ids.error || !ids.data?.length) return;

  const version = await getDdragonVersion();
  const summaries = [];
  for (const matchId of ids.data) {
    const m = await riotGet(`https://${regional}.api.riotgames.com/lol/match/v5/matches/${matchId}`, key);
    if (m.error) continue;
    const s = summarizeParticipant(m.data, puuid);
    if (s) summaries.push({ ...s, championIconUrl: championIconUrl(version, s.championName) });
  }
  if (summaries.length) matchHistory = summaries;
}

if (!DEMO) {
  setInterval(fetchRank, 10 * 60 * 1000);
  setInterval(fetchMatchHistory, 10 * 60 * 1000);
  fetchRank();
  fetchMatchHistory();
}
resolveKickChannel();
getRuneIcons(); // precalentado: el primer !runas no debe esperar a dos descargas

// ---------- LCU: adelantar la descarga durante la selección de campeón ----------
//
// El fichero de u.gg pesa ~2,5 MB y la primera vez con un campeón puede tardar más que la ventana
// en la que el duelo tiene que salir. Pero en selección ya se sabe QUÉ campeón vas a jugar (el
// rival de carril no hace falta para descargar), y la selección dura más de un minuto: de sobra.
//
// La LCU es la API del cliente, NO soportada oficialmente por Riot. Se autentica con el lockfile
// que el cliente escribe al arrancar: "LeagueClient:<pid>:<puerto>:<contraseña>:https". El puerto
// y la contraseña cambian en cada arranque, así que hay que releerlo siempre.
const LOCKFILE_PATHS = [
  "C:\\Riot Games\\League of Legends\\lockfile",
  "D:\\Riot Games\\League of Legends\\lockfile",
  "/Applications/League of Legends.app/Contents/LoL/lockfile",
];

function readLockfile() {
  for (const p of [process.env.LOL_LOCKFILE, ...LOCKFILE_PATHS].filter(Boolean)) {
    try {
      const [, , port, pass] = fs.readFileSync(p, "utf8").trim().split(":");
      if (port && pass) return { port, pass };
    } catch {}
  }
  return null;
}

function lcuGet(lock, endpoint) {
  return new Promise((resolve) => {
    const req = https.get({
      host: "127.0.0.1", port: lock.port, path: endpoint, rejectUnauthorized: false, timeout: 2000,
      headers: { Authorization: "Basic " + Buffer.from(`riot:${lock.pass}`).toString("base64") },
    }, (res) => {
      let b = ""; res.on("data", (c) => (b += c));
      res.on("end", () => { try { resolve(JSON.parse(b)); } catch { resolve(null); } });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(2000, () => { req.destroy(); resolve(null); });
  });
}

let prefetchedKey = null; // campeón ya adelantado, para no repetir la descarga
async function prefetchFromChampSelect() {
  if (!config.uggEnabled || matchupBusy) return;
  const lock = readLockfile();
  if (!lock) return; // cliente cerrado: nada que hacer

  const phase = await lcuGet(lock, "/lol-gameflow/v1/gameflow-phase");
  if (phase !== "ChampSelect") { if (phase !== null) prefetchedKey = null; return; }

  // el endpoint corto da directamente tu campeón; si no está, se saca de la sesión por tu celda
  let key = await lcuGet(lock, "/lol-champ-select/v1/current-champion");
  if (!Number.isInteger(key) || key <= 0) {
    const s = await lcuGet(lock, "/lol-champ-select/v1/session");
    key = (s?.myTeam || []).find((p) => p.cellId === s?.localPlayerCellId)?.championId;
  }
  if (!Number.isInteger(key) || key <= 0 || key === prefetchedKey) return;

  prefetchedKey = key;
  matchupBusy = true;
  getUggMatchups(key)
    .catch(() => {}) // si falla, la partida lo reintentará; esto es solo adelantar trabajo
    .finally(() => { matchupBusy = false; });
}

// ---------- panel de enfrentamientos: se calcula en segundo plano ----------
//
// La primera descarga puede tardar decenas de segundos, así que NUNCA se hace dentro de /status
// (que se pide cada 400 ms). Se dispara al detectar la composición y aquí solo queda el resultado.
let matchupPanel = null; // { role, rows[] } listo para dibujar, o null
let matchupKey = null;   // para qué partida/ajustes se calculó, y no repetirlo
let matchupBusy = false;

async function refreshMatchups(comp, myChampion, myPosition) {
  const catalog = await getChampionCatalog();
  const mine = catalog[myChampion];
  if (!mine) throw new Error(`"${myChampion}" no está en el catálogo de campeones`);
  const patch = await getUggPatch();
  if (!patch) throw new Error("u.gg no respondió a ningún parche reciente");
  const data = await getUggMatchups(mine.key); // lanza con el motivo si u.gg no responde

  const region = UGG_REGION[config.uggRegion === "auto" ? config.riotPlatform : config.uggRegion] ?? UGG_REGION.world;
  const rank = UGG_RANK[config.uggRank] ?? UGG_RANK.overall;
  const role = UGG_ROLE[myPosition] || guessRole(data);
  const version = await getDdragonVersion();

  // El duelo es contra tu rival de carril: el enemigo con tu misma posición. Si el cliente no la da
  // (pasa en algunas colas) no hay duelo que enseñar, y es mejor no sacar nada que inventarse quién.
  const rival = comp.find((p) => !p.mine && p.position && p.position === myPosition);
  if (!rival) throw new Error(`el cliente no dice quién es tu rival de ${myPosition || "carril"} en esta cola`);

  const enemy = catalog[rival.champion];
  if (!enemy) throw new Error(`"${rival.champion}" no está en el catálogo de campeones`);
  const m = findMatchup(data, region, rank, role, enemy.key);
  if (!m) throw new Error(`sin datos de ${myChampion} contra ${rival.champion} en esa región y rango`);
  if (m.games < config.uggMinGames) {
    throw new Error(`solo ${m.games} partidas de ${myChampion} contra ${rival.champion}: muy pocas para enseñar un winrate`);
  }

  const miFila = comp.find((p) => p.mine && p.champion === myChampion);
  return {
    role, roleIconUrl: `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/svg/position-${String(myPosition).toLowerCase()}.svg`,
    // "centered" (1280x720, con el campeón recentrado) en vez del splash crudo, donde
    // cada campeón está colocado en un sitio distinto y no hay recorte que valga para todos.
    // Y con la skin que cada uno lleva puesta: la default suele ser la más fea de todas.
    me: { champion: myChampion, splashUrl: centeredArt(mine.id, miFila?.skin) },
    enemy: { champion: rival.champion, splashUrl: centeredArt(enemy.id, rival.skin) },
    // delta contra el 50%: es lo que se lee de un vistazo, mucho mejor que "48,2%" a secas
    ...m, delta: m.wr - 50, vsStyle: config.vsStyle,
  };
}

// Se llama en cada tick; solo hace trabajo de verdad cuando cambia la partida o los ajustes.
function maybeRefreshMatchups() {
  if (!config.uggEnabled || matchupBusy) return;
  if (!tracker.inGame || !tracker.comp) { matchupPanel = null; matchupKey = null; return; }
  const key = [tracker.championName, tracker.myPosition, config.uggRank, config.uggRegion, config.uggMinGames,
    tracker.comp.filter((p) => !p.mine).map((p) => p.champion).join(",")].join("|");
  if (key === matchupKey) return;
  matchupBusy = true;
  refreshMatchups(tracker.comp, tracker.championName, tracker.myPosition)
    .then((r) => { matchupPanel = r; matchupKey = key; })
    .catch(() => {
      // En el overlay el panel simplemente no sale — nunca un dato dudoso en directo.
      matchupPanel = null; matchupKey = key;
    })
    .finally(() => { matchupBusy = false; });
}

let previewSeq = 0; // se incrementa desde el panel para forzar una transición de prueba
let testCommand = { id: "", seq: 0 }; // idem, para disparar un comando de chat a mano

// Estado real del socket de chat. Quien lo sabe es el overlay (es él quien lo abre), y lo reporta
// colgándose del sondeo de /status que ya hace — sin peticiones extra. Si nadie reporta en 5 s es
// que no hay ningún overlay abierto, así que el panel no puede decir "conectado".
let chatLive = { connected: false, at: 0 };
const chatLiveNow = () => ({ connected: chatLive.connected && Date.now() - chatLive.at < 5000, overlayOpen: Date.now() - chatLive.at < 5000 });
let tracker = createTracker();

function tick(data) {
  tracker = applySnapshot(tracker, data, Date.now());
  maybeRefreshMatchups();
  if (tracker.gameEnded) {
    queueRankedCheck(currentDeadTimeSec(tracker));
    tracker = createTracker();
  }
}

// ---------- sesión de hoy: solo cuenta ranked, y solo lo que confirma la API de Riot -----------
//
// La Live Client Data API no dice si la cola era ranked ni el resultado real de forma confiable
// (ver applySnapshot), así que cuando una partida termina no se suma nada todavía: se guarda cuánto
// tiempo estuviste muerto y se espera a que el historial de partidas (match-v5) publique la partida
// nueva, algo que tarda uno o dos minutos. Ahí sí se sabe la cola y el resultado con certeza.
const RANKED_QUEUE_IDS = new Set([420, 440]); // Solo/Duo y Flex 5v5
let pendingRankedCheck = null; // { deadTimeSec } — hay una partida recién terminada por confirmar
let lastSeenMatchId = null; // el último matchId ya evaluado (contado o descartado), para no repetirlo
let rankedCheckBusy = false;

function queueRankedCheck(deadTimeSec) {
  pendingRankedCheck = { deadTimeSec };
}

// Se llama sola en un intervalo separado y lento (ver setInterval más abajo): consultar match-v5
// tiene sentido solo cada tanto, no en cada tick de 1s.
async function checkPendingRankedResult() {
  if (!pendingRankedCheck || rankedCheckBusy) return;
  const { riotApiKey: key, riotGameName: name, riotTagLine: tag, riotPlatform: platform } = config;
  if (!name || !tag) { pendingRankedCheck = null; return; } // sin cuenta de Riot no hay cómo verificar

  rankedCheckBusy = true;
  try {
    const regional = PLATFORM_TO_REGIONAL[platform] || "americas";
    const acc = await riotGet(`https://${regional}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, key);
    if (acc.error) return;
    const puuid = acc.data.puuid;

    const ids = await riotGet(`https://${regional}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=1`, key);
    const matchId = ids.data?.[0];
    if (!matchId || matchId === lastSeenMatchId) return; // el historial todavía no publicó la partida nueva

    const m = await riotGet(`https://${regional}.api.riotgames.com/lol/match/v5/matches/${matchId}`, key);
    if (m.error) return; // reintenta en el próximo intervalo
    lastSeenMatchId = matchId;

    const { deadTimeSec } = pendingRankedCheck;
    pendingRankedCheck = null; // ya sea que cuente o no, esta partida queda resuelta
    if (!RANKED_QUEUE_IDS.has(m.data?.info?.queueId)) return; // no era ranked: no se suma a la sesión

    const summary = summarizeParticipant(m.data, puuid);
    if (!summary) return;
    session = commitResult(session, deadTimeSec, summary.win ? "Win" : "Lose");
    saveJSON(SESSION_PATH, session);
  } finally {
    rankedCheckBusy = false;
  }
}

// Al arrancar (o al guardar una cuenta de Riot distinta) hay que saber cuál es tu última partida
// YA jugada, para no confundirla con "la que recién terminó" y sumarla de más la primera vez.
async function initLastSeenMatchId() {
  const { riotApiKey: key, riotGameName: name, riotTagLine: tag, riotPlatform: platform } = config;
  if (!name || !tag) return;
  const regional = PLATFORM_TO_REGIONAL[platform] || "americas";
  const acc = await riotGet(`https://${regional}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, key);
  if (acc.error) return;
  const ids = await riotGet(`https://${regional}.api.riotgames.com/lol/match/v5/matches/by-puuid/${acc.data.puuid}/ids?start=0&count=1`, key);
  if (ids.data?.[0]) lastSeenMatchId = ids.data[0];
}
if (!DEMO) { initLastSeenMatchId(); setInterval(checkPendingRankedResult, 15000); }

// ---------- fuente de datos: League real, o simulador --------------------

function httpsGetJson(url) {
  return new Promise((resolve) => {
    https.get(url, { rejectUnauthorized: false, timeout: 1500 }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
    }).on("error", () => resolve(null)).on("timeout", function () { this.destroy(); resolve(null); });
  });
}

// Partida congelada con datos de ejemplo (no avanza en el tiempo): sirve para
// ver el diseño con números realistas sin tener que jugar. El primer tick manda
// una línea base sin eventos y el segundo ya trae todo, así se disparan las
// etiquetas (Primera Sangre / Multikill / Ace) igual que en una partida real.
function demoBaselineSnapshot() {
  return {
    activePlayer: { summonerName: "SummonerPlayer", fullRunes: DEMO_FULL_RUNES },
    allPlayers: demoPlayers(false, 0).map((p) => ({ ...p, scores: { kills: 0, deaths: 0, assists: 0, creepScore: 0 }, items: [] })),
    events: { Events: [] },
    gameData: { gameTime: 0 },
  };
}
// Los 10 jugadores de la demo salen de la misma composición de ejemplo que usa el editor, con la
// forma que da el cliente real — así el modo demo ejercita también !comp, !runas y !build.
// En el orden en que están los campeones de DEMO_COMP: MF tirador, Leona soporte, Ahri central,
// Lee Sin jungla, Darius superior — y lo mismo enfrente. Si no casan, se buscaría un enfrentamiento
// que casi no se juega (MF de superior tiene 4 partidas contra Jinx) y el panel no saldría.
const DEMO_POS = ["BOTTOM", "UTILITY", "MIDDLE", "JUNGLE", "TOP"];
function demoPlayers(dead, phase) {
  const tree = (r) => ({ id: r.id, displayName: r.name });
  return DEMO_COMP.map((p, i) => ({
    summonerName: i === 0 ? "SummonerPlayer" : `Jugador ${i}`,
    championName: p.champion,
    team: p.mine ? "ORDER" : "CHAOS",
    position: DEMO_POS[i % 5], // el duelo necesita saber quién es tu rival de carril
    scores: i === 0 ? { kills: 9, deaths: 2, assists: 16, creepScore: 182 } : { kills: 2, deaths: 4, assists: 6, creepScore: 120 },
    isDead: i === 0 ? dead : false,
    respawnTimer: i === 0 && dead ? 4 - phase : 0,
    items: i === 0 ? [{ itemID: "3089", displayName: "Rabadon's Deathcap" }, { itemID: "6653", displayName: "Liandry's Torment" }] : [],
    runes: { keystone: tree(p.keystone), primaryRuneTree: tree(p.primary), secondaryRuneTree: tree(p.secondary) },
  }));
}

// En demo alterna vivo/muerto cada ~4s para poder ver la transición de tarjetas y la cola.
function demoFrozenSnapshot(tickCount = 0) {
  const killEvt = () => ({ EventName: "ChampionKill", KillerName: "SummonerPlayer", VictimName: "Jugador 5", Assisters: [] });
  const deathEvt = () => ({ EventName: "ChampionKill", KillerName: "Jugador 5", VictimName: "SummonerPlayer", Assisters: [] });
  const phase = tickCount % 8;
  const dead = phase < 4;
  return {
    activePlayer: { summonerName: "SummonerPlayer", fullRunes: DEMO_FULL_RUNES },
    allPlayers: demoPlayers(dead, phase),
    events: { Events: [
      killEvt(), deathEvt(), killEvt(), killEvt(), deathEvt(), killEvt(), killEvt(), killEvt(), killEvt(), killEvt(),
      { EventName: "DragonKill", KillerName: "SummonerPlayer", DragonType: "Fire" },
      { EventName: "DragonKill", KillerName: "SummonerPlayer", DragonType: "Fire" },
      { EventName: "DragonKill", KillerName: "SummonerPlayer", DragonType: "Fire" },
      { EventName: "DragonKill", KillerName: "SummonerPlayer", DragonType: "Earth" },
      { EventName: "TurretKilled", KillerName: "SummonerPlayer" },
      { EventName: "TurretKilled", KillerName: "SummonerPlayer" },
      { EventName: "TurretKilled", KillerName: "SummonerPlayer" },
      { EventName: "TurretKilled", KillerName: "SummonerPlayer" },
      { EventName: "HeraldKill", KillerName: "SummonerPlayer" },
      { EventName: "Multikill", KillerName: "SummonerPlayer", KillStreak: 3 },
      { EventName: "Ace", AcingTeam: "ORDER" },
    ] },
    gameData: { gameTime: tickCount % 60 }, // en bucle: el duelo asoma en su ventana cada minuto
  };
}

let demoTicks = 0;
async function poll() {
  let data;
  if (DEMO) data = demoTicks++ === 0 ? demoBaselineSnapshot() : demoFrozenSnapshot(demoTicks);
  else data = await httpsGetJson("https://127.0.0.1:2999/liveclientdata/allgamedata");
  tick(data);
}
setInterval(poll, 1000);
// La selección de campeón solo importa fuera de partida, y no hace falta mirarla cada segundo.
if (!DEMO) setInterval(() => { if (!tracker.inGame) prefetchFromChampSelect(); }, 3000);

if (DEMO) {
  session = { wins: 3, losses: 2, deadTimeTodaySec: 102 };
  rank = {
    tier: "gold", division: "IV", lp: 37, error: null, title: "Big Game Hunter",
    profileIconUrl: "https://ddragon.leagueoflegends.com/cdn/14.23.1/img/profileicon/4568.png",
    rankBorderUrl: rankBorderFile("gold"),
    prestigeBorderUrl: prestigeBorderFile(150),
  };
  matchHistory = [
    { championName: "Ezreal", win: true, kills: 7, deaths: 1, assists: 12, championIconUrl: "https://ddragon.leagueoflegends.com/cdn/14.23.1/img/champion/Ezreal.png" },
    { championName: "Kaisa", win: false, kills: 2, deaths: 5, assists: 4, championIconUrl: "https://ddragon.leagueoflegends.com/cdn/14.23.1/img/champion/Kaisa.png" },
    { championName: "Yasuo", win: false, kills: 3, deaths: 5, assists: 6, championIconUrl: "https://ddragon.leagueoflegends.com/cdn/14.23.1/img/champion/Yasuo.png" },
    { championName: "Jinx", win: true, kills: 3, deaths: 5, assists: 6, championIconUrl: "https://ddragon.leagueoflegends.com/cdn/14.23.1/img/champion/Jinx.png" },
    { championName: "Lux", win: true, kills: 5, deaths: 2, assists: 9, championIconUrl: "https://ddragon.leagueoflegends.com/cdn/14.23.1/img/champion/Lux.png" },
  ];
}

// ---------- HTTP: estáticos + API ----------------------------------------

const MIME = { ".html": "text/html", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp" };

function sendJSON(res, obj, code = 200) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  fs.readFile(filePath, (err, buf) => {
    if (err) { res.writeHead(404); res.end("not found"); return; }
    // panel.html/overlay.html cambian seguido durante el ajuste — nunca cachear,
    // así una pestaña abierta siempre ve el archivo actual sin refrescar a mano.
    res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream", "cache-control": "no-store" });
    res.end(buf);
  });
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    let size = 0;
    req.on("data", (c) => { size += c.length; if (size < 8_000_000) body += c; });
    req.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}

function fmtTime(sec) {
  sec = Math.max(0, Math.round(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/status") {
    // el overlay cuelga su estado de chat del propio sondeo (?chat=1/0); el panel sondea sin el
    // parámetro, así que nunca pisa el dato del overlay con un "no conectado" falso.
    if (url.searchParams.has("chat")) chatLive = { connected: url.searchParams.get("chat") === "1", at: Date.now() };
    const splashUrl = tracker.inGame && config.championSplash ? await championSplashUrl(tracker.championName) : null;
    // Datos de los paneles de comando. Reales si estás jugando; si no y el editor pidió "mostrar
    // todo", de ejemplo para poder colocarlos sin partida. Nunca de ejemplo durante una partida real.
    const demo = !tracker.inGame && config.editShowAll;
    const version = await getDdragonVersion();
    const icons = await getRuneIcons();
    const fullRunes = tracker.inGame ? tracker.fullRunes : (demo ? DEMO_FULL_RUNES : null);
    const runes = fullRunes ? shapeRunes(fullRunes, icons) : null;
    const rawComp = tracker.inGame ? tracker.comp : (demo ? DEMO_COMP : null);
    const comp = rawComp ? shapeComp(rawComp, icons, await getChampionCatalog(), version) : null;
    const rawBuild = tracker.inGame ? tracker.itemLog : (demo ? DEMO_ITEM_LOG : null);
    const build = rawBuild?.length ? shapeItemLog(rawBuild, version) : null;
    const itemLog = tracker.inGame ? shapeItemLog(tracker.itemLog, version) : []; // el de la tarjeta de muerte
    const matchups = tracker.inGame ? matchupPanel : (demo ? DEMO_MATCHUPS : null);
    return sendJSON(res, {
      runes, comp, build, matchups,
      displayName: config.riotGameName || "Invocador",
      animStyle: config.animStyle,
      forceView: config.forceView,
      respawnStyle: config.respawnStyle,
      numFont: config.numFont,
      lang: config.lang,
      vsFont: config.vsFont,
      vsInfoFont: config.vsInfoFont,
      vsFrom: config.vsFrom, vsTo: config.vsTo,
      tagLine: config.riotTagLine ? `#${config.riotTagLine}` : "",
      widgets: config.widgets,
      parts: config.parts,
      editBgPath: config.editBgPath,
      editShowAll: config.editShowAll,
      kick: { ...kick, ...chatLiveNow() },
      cmdDurationMs: config.cmdDurationMs,
      cmdCooldownMs: config.cmdCooldownMs,
      testCommand,
      previewSeq,
      iconFit: config.iconFit,
      session: { wins: session.wins, losses: session.losses },
      game: tracker.inGame ? {
        championName: tracker.championName,
        championSplashUrl: splashUrl,
        kills: tracker.lastKills, deaths: tracker.lastDeaths, assists: tracker.lastAssists,
        gameTime: Math.round(tracker.lastGameTime),
        gameTimeStr: fmtTime(tracker.lastGameTime),
        cs: tracker.creepScore,
        csPerMin: tracker.lastGameTime > 0 ? (tracker.creepScore / (tracker.lastGameTime / 60)).toFixed(1) : "0.0",
        killStreak: tracker.killStreak,
        itemLog,
        objectives: tracker.objectives,
        dragons: tracker.dragons,
        tags: { firstBlood: tracker.firstBloodTag, multikill: tracker.multikillTag, ace: tracker.aceTag },
        isDead: tracker.wasDead,
        respawnTimer: Math.round(tracker.respawnTimer),
        deathElapsedStr: fmtTime(tracker.wasDead && tracker.deathStartGameTime != null ? tracker.lastGameTime - tracker.deathStartGameTime : 0),
      } : null,
      rank: rank.tier ? { ...rank, emblemUrl: emblemUrl(rank.tier) } : rank,
      matchHistory,
    });
  }

  // Dispara una transición de prueba en el overlay (para ver la animación al instante).
  if (req.method === "POST" && url.pathname === "/preview-anim") {
    previewSeq++;
    return sendJSON(res, { ok: true, previewSeq });
  }

  // Simula que alguien escribió el comando en el chat, para probar sin depender del chat real.
  // El seq es lo que hace que el overlay lo detecte una sola vez aunque sondee cada 400 ms.
  if (req.method === "POST" && url.pathname === "/test-command") {
    const body = await readBody(req);
    testCommand = { id: String(body.id || ""), seq: testCommand.seq + 1 };
    return sendJSON(res, { ok: true, testCommand });
  }

  if (req.method === "POST" && url.pathname === "/refresh-rank") {
    await fetchRank();
    return sendJSON(res, { ok: true, rank });
  }

  if (req.method === "GET" && url.pathname === "/config") return sendJSON(res, config);

  if (req.method === "POST" && url.pathname === "/config") {
    const body = await readBody(req);
    // fondo de referencia del editor: sube como data URL, se guarda en disco y en el config
    // queda solo la ruta. El ?v= es antichaché — el nombre de archivo se reusa al re-subir.
    const m = /^data:image\/(\w+);base64,(.+)$/.exec(body.editBgDataUrl || "");
    if (m) {
      const fname = `editbg.${m[1] === "jpeg" ? "jpg" : m[1]}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, fname), Buffer.from(m[2], "base64"));
      body.editBgPath = `/uploads/${fname}?v=${Date.now()}`;
    }
    delete body.editBgDataUrl;
    config = {
      ...config, ...body,
      widgets: mergeDeep2(config.widgets, body.widgets),
      parts: { ...config.parts, ...(body.parts || {}) },
      // El panel ya no manda iconFit; si llegara de una versión vieja, se
      // ignora.
      iconFit: FIT_FIJO,
    };
    saveJSON(CONFIG_PATH, config);
    if (body.riotApiKey || body.riotGameName || body.riotTagLine || body.riotPlatform) {
      await fetchRank();
      await fetchMatchHistory();
      await initLastSeenMatchId();
    }
    if (body.kickChannel !== undefined) await resolveKickChannel();
    return sendJSON(res, { ok: true, rank, matchHistory, kick: { ...kick, ...chatLiveNow() } });
  }

  if (req.method === "POST" && url.pathname === "/reset-session") {
    session = { ...DEFAULT_SESSION };
    saveJSON(SESSION_PATH, session);
    return sendJSON(res, { ok: true });
  }

  if (url.pathname.startsWith("/uploads/")) return serveFile(res, path.join(UPLOADS_DIR, path.basename(url.pathname)));

  const file = url.pathname === "/" ? "/panel.html" : url.pathname;
  serveFile(res, path.join(PUBLIC_DIR, path.normalize(file).replace(/^(\.\.[/\\])+/, "")));
});

// ---------- auto-test de la lógica pura -----------------------------------

(function selfTest() {
  let tr = createTracker();
  const snap = (over) => ({ activePlayer: { summonerName: "Yo" }, allPlayers: [{ summonerName: "Yo", scores: { kills: 0, deaths: 0, assists: 0 }, isDead: false, ...over }], events: { Events: [] }, gameData: { gameTime: 0 } });

  tr = applySnapshot(tr, snap({ scores: { kills: 0, deaths: 0, assists: 0 } }), 1000);
  console.assert(tr.inGame, "debe entrar en partida al recibir el primer snapshot");

  tr = applySnapshot(tr, {
    ...snap({}), gameData: { gameTime: 10 },
    allPlayers: [{ summonerName: "Yo", scores: { kills: 1, deaths: 0, assists: 0 }, isDead: false }],
    events: { Events: [{ EventName: "ChampionKill", KillerName: "Yo", VictimName: "Enemigo", Assisters: [] }] },
  }, 2000);
  console.assert(tr.lastKills === 1 && tr.killFlashAt === 2000, "un kill nuevo (evento ChampionKill) debe marcar killFlashAt");

  tr = applySnapshot(tr, { ...snap({}), gameData: { gameTime: 15 }, allPlayers: [{ summonerName: "Yo", scores: { kills: 1, deaths: 0, assists: 0 }, isDead: true, respawnTimer: 22 }] }, 3000);
  console.assert(tr.respawnTimer === 22, "respawnTimer debe reflejar el valor en vivo mientras está muerto");
  tr = applySnapshot(tr, { ...snap({}), gameData: { gameTime: 20 }, allPlayers: [{ summonerName: "Yo", scores: { kills: 1, deaths: 1, assists: 0 }, isDead: false }] }, 4000);
  console.assert(tr.gameDeadTimeSec === 5, `5s muerto esperados, dio ${tr.gameDeadTimeSec}`);
  console.assert(tr.respawnTimer === 0, "respawnTimer debe volver a 0 al revivir");

  let sess = { ...DEFAULT_SESSION };
  sess = commitResult(sess, currentDeadTimeSec(tr), "Win");
  console.assert(sess.wins === 1 && sess.deadTimeTodaySec === 5, "commitResult debe sumar la victoria y el tiempo muerto");

  const gold = normalizeRankEntry({ tier: "GOLD", rank: "IV", leaguePoints: 37 });
  console.assert(gold.tier === "gold" && gold.division === "IV" && gold.lp === 37, "normalizeRankEntry: división visible en tiers normales");
  console.assert(normalizeRankEntry({ tier: "MASTER", rank: "I", leaguePoints: 120 }).division === null, "normalizeRankEntry: Master+ no debe mostrar división");
  console.assert(emblemUrl("gold").endsWith("emblem-gold.png"), "emblemUrl: debe apuntar al PNG del tier correcto");
  console.assert(profileIconUrl("14.23.1", 4567).endsWith("/profileicon/4567.png"), "profileIconUrl: debe apuntar al ícono correcto");
  console.assert(findTitleName([{ itemId: 1, titleName: "Apprentice" }, { itemId: 30110005, titleName: "Big Game Hunter" }], 30110005) === "Big Game Hunter", "findTitleName debe resolver el código al texto real");
  console.assert(findTitleName([], 999) === null, "findTitleName debe devolver null si no hay coincidencia");
  console.assert(prestigeBorderFile(150) === "/borders/level-150.png", "prestigeBorderFile: coincidencia exacta");
  console.assert(prestigeBorderFile(160) === "/borders/level-150.png", "prestigeBorderFile: se queda en el hito más alto ya alcanzado");
  console.assert(prestigeBorderFile(0) === "/borders/level-1.png", "prestigeBorderFile: por debajo del mínimo cae al nivel 1");
  console.assert(prestigeBorderFile(999999) === "/borders/level-500.png", "prestigeBorderFile: por encima del máximo se topa en 500");
  console.assert(rankBorderFile("gold") === "/borders/rank/gold.png", "rankBorderFile: arma la ruta por tier");
  console.assert(rankBorderFile(null) === null, "rankBorderFile: sin tier no hay borde");

  // racha, primera sangre, multikill, ace, dragones, objetivos
  const players = (myScores, rivalScores) => ([
    { summonerName: "Yo", team: "ORDER", scores: { kills: 0, deaths: 0, assists: 0, creepScore: 0, ...myScores }, isDead: false },
    { summonerName: "Rival", team: "CHAOS", scores: { kills: 0, deaths: 0, assists: 0, creepScore: 0, ...rivalScores }, isDead: false },
  ]);
  const snap2 = (gameTime, events, myScores) => ({
    activePlayer: { summonerName: "Yo" }, allPlayers: players(myScores, {}),
    events: { Events: events }, gameData: { gameTime },
  });

  let tr2 = createTracker();
  tr2 = applySnapshot(tr2, snap2(0, [], {}), 500); // línea base: entra a la partida con 0 kills
  tr2 = applySnapshot(tr2, snap2(5, [{ EventName: "ChampionKill", KillerName: "Yo", VictimName: "Rival", Assisters: [] }], { kills: 1 }), 1000);
  console.assert(tr2.killStreak === 1, "un kill debe subir la racha");
  console.assert(tr2.firstBloodTag?.mine === true, "primera sangre propia debe detectarse en el primer ChampionKill");

  tr2 = applySnapshot(tr2, snap2(10, [
    { EventName: "ChampionKill", KillerName: "Yo", VictimName: "Rival", Assisters: [] },
    { EventName: "ChampionKill", KillerName: "Rival", VictimName: "Yo", Assisters: [] },
  ], { kills: 1, deaths: 1 }), 2000);
  console.assert(tr2.killStreak === 0, "morir debe resetear la racha");

  tr2 = applySnapshot(tr2, snap2(15, [
    ...[{ EventName: "ChampionKill", KillerName: "Yo", VictimName: "Rival", Assisters: [] }, { EventName: "ChampionKill", KillerName: "Rival", VictimName: "Yo", Assisters: [] }],
    { EventName: "DragonKill", KillerName: "Yo", DragonType: "Fire" },
    { EventName: "TurretKilled", KillerName: "Yo" },
    { EventName: "Multikill", KillerName: "Yo", KillStreak: 2 },
    { EventName: "Ace", AcingTeam: "ORDER" },
  ], { kills: 1, deaths: 1 }), 3000);
  console.assert(tr2.dragons.Infernal === 1, "DragonKill de mi equipo debe sumar al tipo correcto");
  console.assert(tr2.objectives.towers === 1, "TurretKilled de mi equipo debe sumar a objetivos");
  console.assert(tr2.multikillTag?.text === "¡Doble Kill!", "Multikill con KillStreak 2 debe etiquetarse Doble Kill");
  console.assert(tr2.aceTag?.mine === true, "Ace de mi equipo debe marcarse como propio");

  // items: se detectan por diff de inventario (no por evento), completos o componentes por igual
  let tr2b = createTracker();
  tr2b = applySnapshot(tr2b, {
    activePlayer: { summonerName: "Yo" },
    allPlayers: [{ summonerName: "Yo", team: "ORDER", scores: { kills: 0, deaths: 0, assists: 0, creepScore: 0 }, isDead: false,
      items: [{ itemID: "8888", displayName: "Componente de prueba" }, { itemID: "9999", displayName: "Legendario de prueba" }] }],
    events: { Events: [] }, gameData: { gameTime: 600 },
  }, 4000);
  console.assert(tr2b.itemLog.length === 2, "itemLog debe incluir componentes y legendarios por igual");
  console.assert(tr2b.itemLog[0].atGameTime === 600, "itemLog guarda el gameTime real en que se detectó la compra");

  const eventsSoFar = [
    { EventName: "ChampionKill", KillerName: "Yo", VictimName: "Rival", Assisters: [] },
    { EventName: "ChampionKill", KillerName: "Rival", VictimName: "Yo", Assisters: [] },
    { EventName: "DragonKill", KillerName: "Yo", DragonType: "Fire" },
    { EventName: "TurretKilled", KillerName: "Yo" },
    { EventName: "Multikill", KillerName: "Yo", KillStreak: 2 },
    { EventName: "Ace", AcingTeam: "ORDER" },
  ];
  tr2 = applySnapshot(tr2, snap2(20, [...eventsSoFar, { EventName: "Multikill", KillerName: "Yo", KillStreak: 5 }], { kills: 1, deaths: 1 }), 4000);
  console.assert(tr2.multikillTag?.text === "¡Pentakill!", "un Pentakill debe reemplazar al Doble Kill anterior");
  tr2 = applySnapshot(tr2, snap2(25, [...eventsSoFar, { EventName: "Multikill", KillerName: "Yo", KillStreak: 5 }, { EventName: "Multikill", KillerName: "Yo", KillStreak: 2 }], { kills: 1, deaths: 1 }), 5000);
  console.assert(tr2.multikillTag?.text === "¡Pentakill!", "un Doble Kill posterior NO debe pisar un Pentakill ya obtenido");

  const fakeMatch = { info: { participants: [{ puuid: "abc", championName: "Ahri", win: true, kills: 7, deaths: 1, assists: 12 }, { puuid: "xyz", championName: "Zed", win: false, kills: 2, deaths: 5, assists: 4 }] } };
  const summary = summarizeParticipant(fakeMatch, "abc");
  console.assert(summary.championName === "Ahri" && summary.win === true && summary.kills === 7, "summarizeParticipant debe encontrar al jugador por puuid");
  console.assert(summarizeParticipant(fakeMatch, "no-existe") === null, "summarizeParticipant debe devolver null si el puuid no está en la partida");

  // registro de elementos: un patch parcial de un widget no puede borrarle las otras claves
  const merged = mergeDeep2({ dead: { x: 5, y: 7, scale: 1.2, on: true }, alive: { x: 0, y: 0 } }, { dead: { x: 99 } });
  console.assert(merged.dead.x === 99 && merged.dead.scale === 1.2 && merged.dead.on === true, "mergeDeep2: el patch parcial no debe perder el resto del sub-objeto");
  console.assert(merged.alive.x === 0, "mergeDeep2: los sub-objetos que el patch no toca quedan intactos");
  console.assert(Object.keys(mergeDeep2({}, undefined)).length === 0, "mergeDeep2: sin patch devuelve la base tal cual");

  // runas: los iconos de DDragon van SIN versión en la ruta (con versión da 403) y los shards
  // solo existen en Community Dragon, así que el mapa tiene que salir de las dos fuentes.
  const icons = buildRuneIconMap(
    [{ id: 8100, icon: "perk-images/Styles/7200_Domination.png", slots: [{ runes: [{ id: 8112, icon: "perk-images/Styles/Domination/Electrocute/Electrocute.png" }] }] }],
    [{ id: 5008, iconPath: "/lol-game-data/assets/v1/perk-images/StatMods/StatModsAdaptiveForceIcon.png" }, { id: 3089, iconPath: "/no/deberia/entrar.png" }],
  );
  console.assert(icons[8112] === "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Domination/Electrocute/Electrocute.png", "buildRuneIconMap: la runa NO lleva versión en la ruta");
  console.assert(icons[8100].endsWith("7200_Domination.png"), "buildRuneIconMap: el árbol también entra al mapa");
  console.assert(icons[5008] === `${CDRAGON_BASE}/v1/perk-images/statmods/statmodsadaptiveforceicon.png`, `buildRuneIconMap: el shard sale de cdragon en minúsculas, dio ${icons[5008]}`);
  console.assert(icons[3089] === undefined, "buildRuneIconMap: solo entran ids de shard (5000-5999), no cualquier perk");

  const shaped = shapeRunes({
    keystone: { id: 8112, displayName: "Electrocutar" },
    primaryRuneTree: { id: 8100, displayName: "Dominación" },
    secondaryRuneTree: { id: 8200, displayName: "Brujería" },
    generalRunes: [{ id: 8112, displayName: "Electrocutar" }, { id: 8126, displayName: "Sabor a sangre" }, { id: 8138, displayName: "Golpe de gracia" }, { id: 8135, displayName: "Cazador definitivo" }, { id: 8210, displayName: "Trascendencia" }, { id: 8237, displayName: "Escalada" }],
    statRunes: [{ id: 5008, rawDescription: "Fuerza adaptativa" }, { id: 5008, rawDescription: "Fuerza adaptativa" }, { id: 5011, rawDescription: "Vida" }],
  }, icons);
  console.assert(shaped.keystone.name === "Electrocutar" && shaped.keystone.iconUrl === icons[8112], "shapeRunes: la keystone conserva el nombre del cliente y resuelve su icono");
  console.assert(shaped.perks.length === 5, `shapeRunes: generalRunes sin la keystone son 5 perks, dio ${shaped.perks.length}`);
  console.assert(shaped.perks[0].id === 8126, "shapeRunes: el primer perk es el que sigue a la keystone, no la keystone otra vez");
  console.assert(shaped.shards.length === 3 && shaped.shards[2].name === "Vida", "shapeRunes: los 3 shards salen de statRunes");
  console.assert(shapeRunes(null, icons) === null, "shapeRunes: sin runas devuelve null en vez de romper");

  // las runas se cachean una sola vez: si el cliente deja de mandarlas a mitad de partida, no se pierden
  let tr3 = createTracker();
  const runeSnap = (fr) => ({ activePlayer: { summonerName: "Yo", fullRunes: fr }, allPlayers: [{ summonerName: "Yo", team: "ORDER", scores: { kills: 0, deaths: 0, assists: 0, creepScore: 0 }, isDead: false }], events: { Events: [] }, gameData: { gameTime: 0 } });
  tr3 = applySnapshot(tr3, runeSnap({ keystone: { id: 8112 } }), 1000);
  tr3 = applySnapshot(tr3, runeSnap(undefined), 2000);
  console.assert(tr3.fullRunes?.keystone?.id === 8112, "las runas cacheadas no se pierden si un snapshot posterior no las trae");

  // el canal de Kick se acepta como sea que lo peguen, y nunca deja pasar nada que no sea un slug
  console.assert(cleanSlug("https://kick.com/MiCanal/videos") === "micanal", `cleanSlug: URL completa -> slug, dio ${cleanSlug("https://kick.com/MiCanal/videos")}`);
  console.assert(cleanSlug("  MiCanal  ") === "micanal", "cleanSlug: recorta y pasa a minúsculas");
  console.assert(cleanSlug("mi-canal_2") === "mi-canal_2", "cleanSlug: guiones y guiones bajos son válidos en Kick");
  console.assert(cleanSlug("../../etc/passwd") === "", "cleanSlug: una ruta no es un canal, tiene que quedar en nada");
  console.assert(cleanSlug("xqc?x=1&y=2") === "xqc", "cleanSlug: descarta lo que venga pegado después del nombre");
  console.assert(cleanSlug("") === "" && cleanSlug(null) === "", "cleanSlug: vacío o nulo no rompe");

  // composición: solo campeón, equipo y los 3 ids de runa que la API da de los demás
  const compPlayers = [
    { championName: "Ahri", team: "ORDER", summonerName: "Yo", runes: { keystone: { id: 8112, displayName: "Electrocutar" }, primaryRuneTree: { id: 8100, displayName: "Dominación" }, secondaryRuneTree: { id: 8200, displayName: "Brujería" } } },
    { championName: "Zed", team: "CHAOS", summonerName: "Rival", runes: { keystone: { id: 8010, displayName: "Conquistador" }, primaryRuneTree: { id: 8000, displayName: "Precisión" }, secondaryRuneTree: { id: 8400, displayName: "Valor" } } },
  ];
  const comp = extractComp(compPlayers, "ORDER");
  console.assert(comp[0].mine === true && comp[1].mine === false, "extractComp: marca cuáles son de tu equipo");
  console.assert(comp[0].keystone.id === 8112 && comp[0].secondary.id === 8200, "extractComp: guarda keystone y los dos árboles");
  console.assert(!("summonerName" in comp[0]) && !("riotId" in comp[0]), "extractComp: no debe guardar nombres de jugador, solo el campeón");

  const shapedComp = shapeComp(comp, icons, { Ahri: { id: "Ahri", key: 103 }, Zed: { id: "Zed", key: 238 } }, "14.23.1");
  console.assert(shapedComp[0].championIconUrl.endsWith("/champion/Ahri.png"), "shapeComp: resuelve el icono del campeón por el catálogo");
  console.assert(shapedComp[0].keystone.iconUrl === icons[8112], "shapeComp: la keystone reusa el mismo mapa de iconos que !runas");
  console.assert(shapeComp(null, icons, {}, "1") === null, "shapeComp: sin composición devuelve null");

  // la comp no se captura hasta que el cliente trae las runas de los demás
  let tr4 = createTracker();
  const compSnap = (players) => ({ activePlayer: { summonerName: "Yo" }, allPlayers: players, events: { Events: [] }, gameData: { gameTime: 0 } });
  const sinRunas = [{ championName: "Ahri", team: "ORDER", summonerName: "Yo", scores: { kills: 0, deaths: 0, assists: 0, creepScore: 0 }, isDead: false }];
  tr4 = applySnapshot(tr4, compSnap(sinRunas), 1000);
  console.assert(tr4.comp === null, "sin runas todavía, la composición NO se cachea (quedaría vacía toda la partida)");
  tr4 = applySnapshot(tr4, compSnap([{ ...sinRunas[0], runes: compPlayers[0].runes }]), 2000);
  console.assert(tr4.comp?.[0]?.keystone?.id === 8112, "en cuanto llegan las runas, la composición se captura");

  // u.gg: conversión de parche y lectura de una fila de enfrentamiento
  console.assert(normalizePatch("16.14.1") === "16_14", "normalizePatch: version de DDragon -> ruta de u.gg");
  console.assert(normalizePatch("16_14") === "16_14", "normalizePatch: ya normalizado se queda igual");
  console.assert(uggTier(46).tier === "C" && uggTier(49).tier === "B" && uggTier(58).tier === "S+", "uggTier: mismos umbrales que u.gg");
  console.assert(uggTier(44.9).tier === "D" && uggTier(55).tier === "S+", "uggTier: los extremos caen donde deben");

  // estructura real: [region][rango][rol] -> [[filas], fecha]; fila = [idRival, victorias, partidas, ...]
  const fakeUgg = { 12: { 8: { 1: [[[200, 69, 107, 0, 0], [238, 10, 20, 0, 0]], "2026-01-01"] } } };
  const mu = findMatchup(fakeUgg, 12, 8, 1, 200);
  console.assert(Math.abs(mu.wr - 64.49) < 0.01 && mu.games === 107, `findMatchup: 69/107 debe dar 64,49%, dio ${mu?.wr}`);
  console.assert(mu.tier === "S+", "findMatchup: 64% es S+");
  console.assert(findMatchup(fakeUgg, 12, 8, 1, 999) === null, "findMatchup: rival que no está devuelve null, no rompe");
  console.assert(findMatchup(fakeUgg, 6, 8, 1, 200) === null, "findMatchup: región sin datos devuelve null");
  console.assert(guessRole(fakeUgg) === 1, "guessRole: elige el rol con más partidas");

  // DDragon trae las variantes de League Classic con el MISMO nombre visible y clave 60000+:
  // si entran al catálogo pisan al campeón real y todo lo que se busque por nombre falla.
  const catConClassic = buildChampionCatalog([{
    Amumu: { id: "Amumu", key: "32", name: "Amumu" },
    Jade_Amumu: { id: "Jade_Amumu", key: "60032", name: "Amumu" },
    Ahri: { id: "Ahri", key: "103", name: "Ahri" },
  }]);
  console.assert(catConClassic.Amumu.key === 32, `catálogo: "Amumu" debe ser 32, no la variante Classic (dio ${catConClassic.Amumu.key})`);
  console.assert(catConClassic.Amumu.id === "Amumu", "catálogo: el id tiene que ser el del campeón real, si no el icono sale roto");
  console.assert(Object.keys(catConClassic).length === 2, "catálogo: la variante Classic no añade una entrada aparte");
})();

server.listen(PORT, () => {
  console.log(`\n  LoL overlay — panel:   http://localhost:${PORT}/panel.html`);
  console.log(`  LoL overlay — overlay: http://localhost:${PORT}/overlay.html  (fuente de navegador en OBS)`);
  if (DEMO) console.log("  Modo --demo: partida simulada en bucle, no hace falta tener League abierto.\n");
  else console.log("  Sondeando https://127.0.0.1:2999 — abre esto con una partida de League en curso.\n");
});

// para main.js (Electron): saber cuándo el servidor ya está escuchando antes de abrir la ventana.
export default server;
export { PORT };
