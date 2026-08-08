// Cliente de S-Rank Arena: servidor local + interfaz en el navegador.
//
// Por qué así y no Tauri: Tauri necesita el SDK de Windows para enlazar, que no
// está instalado, y el proyecto lleva meses sin poder compilarse ni una vez.
// Este patrón —servidor Node en localhost y un .bat que lo arranca— es el mismo
// que ya usa el overlay de streamer, funciona hoy, y los streamers acaban
// arrancando una sola cosa en vez de dos. Envolverlo en Tauri después es
// añadir una ventana alrededor, no reescribirlo.
//
//   node server.mjs          → http://localhost:8788
//
// La sesión se guarda en disco para no pedir la contraseña en cada arranque.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { join, extname, dirname, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { exec, execFile, spawn } from "node:child_process";
import { request as httpsRequest } from "node:https";
import { fileURLToPath } from "node:url";

const RAIZ = dirname(fileURLToPath(import.meta.url));
const PUERTO = Number(process.env.SRANK_PORT ?? 8788);
const API = process.env.SRANK_API ?? "https://www.srankarena.com";

// Dónde se escriben sesión y configuración. Una vez instalado, la carpeta del
// programa no es escribible, así que Electron pasa aquí la de datos de usuario.
// Sin instalar, al lado del código y listo.
const DATOS = process.env.SRANK_DATA_DIR ?? RAIZ;
if (!existsSync(DATOS)) mkdirSync(DATOS, { recursive: true });

const SESION = join(DATOS, "sesion.json");

// Estas dos son públicas por diseño: la anon key va en el HTML de cualquier
// página de Supabase. La service role no aparece aquí ni puede aparecer.
const SUPABASE_URL = process.env.SRANK_SUPABASE_URL ?? "https://iucvkkujwtsxeefkagiw.supabase.co";
const SUPABASE_ANON = process.env.SRANK_SUPABASE_ANON ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1Y3Zra3Vqd3RzeGVlZmthZ2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2OTU4MzYsImV4cCI6MjA5MTI3MTgzNn0.b8UOUgT012AQzooxGcT_EbLAhRi8RhfGsB-NgvrZHlw";

let sesion = existsSync(SESION) ? JSON.parse(readFileSync(SESION, "utf8")) : null;

function guardar(s) {
  sesion = s;
  if (s) writeFileSync(SESION, JSON.stringify(s, null, 2));
  else if (existsSync(SESION)) rmSync(SESION);
}

async function supabaseAuth(ruta, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${ruta}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, body: await res.json() };
}

// Nonce de un solo uso para el login por navegador. Sin él, cualquier página
// podría mandar al usuario a http://127.0.0.1:8788/callback con tokens ajenos y
// dejarle el cliente con la sesión de otra persona.
let esperando = null;

async function entrar(email, password) {
  const r = await supabaseAuth("token?grant_type=password", { email, password });
  if (!r.ok) return { error: r.body.error_description ?? r.body.msg ?? "No se pudo iniciar sesión" };

  guardar({
    token: r.body.access_token,
    refresh: r.body.refresh_token,
    // El token caduca a la hora; se renueva antes de que pase.
    expira: Date.now() + (r.body.expires_in ?? 3600) * 1000,
    email: r.body.user?.email,
  });
  return { ok: true };
}

/** Devuelve un token válido, renovándolo si le queda poco. */
async function token() {
  if (!sesion) return null;
  if (Date.now() < sesion.expira - 60_000) return sesion.token;

  const r = await supabaseAuth("token?grant_type=refresh_token", { refresh_token: sesion.refresh });
  if (!r.ok) { guardar(null); return null; }  // refresh caducado: a iniciar sesión otra vez

  guardar({
    ...sesion,
    token: r.body.access_token,
    refresh: r.body.refresh_token,
    expira: Date.now() + (r.body.expires_in ?? 3600) * 1000,
  });
  return sesion.token;
}

/** Proxy hacia la web con el token puesto: el navegador nunca lo ve. */
async function api(ruta, cuerpo) {
  const t = await token();
  if (!t) return { status: 401, body: { error: "Sin sesión" } };
  const res = await fetch(`${API}${ruta}`, {
    method: cuerpo ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${t}`,
      ...(cuerpo ? { "Content-Type": "application/json" } : {}),
    },
    ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

// ── Overlay de streamer ─────────────────────────────────────────────────────
// Es el proyecto del overlay tal cual, corriendo como proceso hijo. No se
// reescribe ni se porta: los comandos de Kick, la pantalla de enfrentamiento y
// la tarjeta de muerte ya funcionan, y tocarlos solo podría romperlos.
const PUERTO_OVERLAY = 8787;
const OVERLAY_URL = `http://localhost:${PUERTO_OVERLAY}`;
let overlay = null;

/** Solo admins y quien tenga el distintivo. Lo decide el servidor, no el HTML. */
async function esStreamer() {
  const me = await api("/api/me");
  if (me.status !== 200 || !me.body) return false;
  return me.body.is_streamer === true || me.body.role === "admin";
}

async function arrancarOverlay() {
  if (overlay && !overlay.killed) return { url: OVERLAY_URL, yaEstaba: true };

  // Empaquetado, el código vive dentro de app.asar, que es un archivo: no se
  // puede lanzar un proceso desde ahí. electron-builder deja el overlay fuera
  // (asarUnpack) y esa copia es la que hay que ejecutar.
  const script = join(RAIZ, "overlay", "server.mjs").replace(
    `app.asar${sep}`,
    `app.asar.unpacked${sep}`
  );
  if (!existsSync(script)) return { error: "Falta el overlay en la instalación" };

  // ELECTRON_RUN_AS_NODE: dentro de Electron, `process.execPath` es el binario
  // de Electron, no node. Sin esta variable intentaría abrir una ventana con el
  // script en vez de ejecutarlo, y el overlay no arrancaría nunca.
  overlay = spawn(process.execPath, [script], {
    cwd: dirname(script),
    // Su configuración —con la clave de Riot del streamer— vive fuera del
    // programa, para que actualizar el cliente no la borre.
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      LOL_OVERLAY_DATA_DIR: join(DATOS, "overlay-datos"),
      // Para que sus llamadas a Riot vuelvan por aquí y lleguen a la web con
      // la clave puesta. Sin esto seguiría pidiendo una clave al streamer.
      SRANK_LOCAL: `http://127.0.0.1:${PUERTO}`,
    },
    stdio: "ignore",
  });
  overlay.on("exit", () => { overlay = null; });

  // El overlay tarda un momento en escuchar; sin esta espera el iframe carga
  // antes de tiempo y muestra un error de conexión.
  await new Promise((r) => setTimeout(r, 1200));
  return { url: OVERLAY_URL, yaEstaba: false };
}

// Si se cierra el cliente, el overlay se va con él: dejarlo huérfano en segundo
// plano ocupando el 8787 impide volver a arrancarlo.
for (const señal of ["SIGINT", "SIGTERM", "exit"]) {
  process.on(señal, () => { if (overlay && !overlay.killed) overlay.kill(); });
}

// ── Avisos ──────────────────────────────────────────────────────────────────
/**
 * Aviso propio si corremos dentro de Electron —ventana sin marco, con el estilo
 * de la aplicación y que se ve sobre la partida— y globo de Windows si no.
 *
 * El respaldo existe porque este servidor también se ejecuta suelto con node
 * durante el desarrollo, sin ninguna ventana alrededor.
 */
function avisar(titulo, cuerpo, urgente = true, destino = null) {
  if (typeof globalThis.__srankAvisar === "function") {
    globalThis.__srankAvisar(titulo, cuerpo, urgente, destino);
    console.log(`  [aviso] ${titulo}`);
    return;
  }
  // El globo de Windows no lleva a ningún sitio: es del sistema y no se le
  // puede colgar una acción. Fuera de Electron el destino se pierde.
  avisarConWindows(titulo, cuerpo);
}

/** La ficha donde se acepta o se rechaza. Sin torneo, la lista. */
const fichaDelCastigo = (reto) =>
  reto?.tournamentId ? `${API}/es/tournaments/${reto.tournamentId}?tab=leaderboard` : `${API}/es/tournaments`;

function avisarConWindows(titulo, cuerpo) {
  const ps = `
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
[System.Media.SystemSounds]::Exclamation.Play()
$n = New-Object System.Windows.Forms.NotifyIcon
$n.Icon = [System.Drawing.SystemIcons]::Warning
$n.BalloonTipTitle = ${JSON.stringify(titulo)}
$n.BalloonTipText  = ${JSON.stringify(cuerpo)}
$n.Visible = $true
$n.ShowBalloonTip(15000)
Start-Sleep -Seconds 8
$n.Dispose()`;
  // execFile con argumentos sueltos: montar la orden como una cadena obliga a
  // escapar comillas a mano y falla en silencio con cualquier acento o comilla.
  execFile("powershell", ["-NoProfile", "-WindowStyle", "Hidden", "-Command", ps], () => {});
  console.log(`  [aviso] ${titulo}`);
}

/**
 * Vigila el cliente de League y avisa en los dos momentos que importan: al
 * entrar en cola, para recordarle lo que lleva encima mientras aún puede
 * planear; y en selección, si va a incumplirlo y todavía está a tiempo.
 *
 * Vive aquí y no en un script aparte porque el usuario no va a arrancar dos
 * cosas, y porque este proceso ya sondea la LCU para la barra.
 */
let faseAnterior = null;
let avisadoEnCola = false;
let ultimoProblema = null;
let reportadoAutofill = false;
let posicionEnCola = null;

/**
 * ¿Está incumpliendo Autofill con lo que tiene elegido ahora mismo?
 *
 * Sin posición devuelve null: el lobby recién abierto no trae ninguna y
 * avisarle ahí sería gritarle por no haber hecho nada todavía. La comparación
 * es la misma que aplica el servidor en /api/castigos/report — si un día deja
 * de serlo, el aviso diría una cosa y el veredicto otra.
 */
export function problemaAutofill(primera) {
  if (!primera) return null;
  return primera.toUpperCase() === "FILL" ? null : `Tienes ${primera} elegido, no Autofill`;
}

/**
 * Deja en el cliente de League un conjunto con lo que «Presupuesto ajustado»
 * prohíbe, y lo retira cuando el castigo se acaba.
 *
 * No impide comprar nada: un conjunto de objetos es una lista de sugerencias en
 * la tienda. Sirve para que el jugador vea de un vistazo lo que no puede tocar
 * en vez de calcular precios de memoria en plena partida. Quien decide sigue
 * siendo la comprobación de la partida.
 *
 * Los ids salen del servidor, del mismo catálogo que usa esa comprobación: una
 * lista escrita a mano se quedaría vieja al primer parche y estaría dando por
 * bueno lo que no lo es.
 */
const CONJUNTO = "⛔ PROHIBIDOS · Presupuesto ajustado";
let prohibidos = null;
let conjuntoPuesto = null;   // lo último que se dejó escrito, para no repetir

async function sincronizarConjunto(reto) {
  const toca = reto?.key === "presupuesto" && reto.status === "accepted";
  if (toca === conjuntoPuesto) return;   // ya está como debe

  const yo = await lcu("/lol-summoner/v1/current-summoner");
  if (!yo?.summonerId) return;           // cliente cerrado: se reintenta luego

  const actual = await lcu(`/lol-item-sets/v1/item-sets/${yo.summonerId}/sets`);
  if (!actual?.itemSets) return;

  // Se leen los suyos y se devuelven todos: escribir reemplaza el lote entero,
  // así que mandar solo el nuestro le borraría los conjuntos al streamer. Y eso
  // no se recupera.
  const suyos = actual.itemSets.filter((s) => s.title !== CONJUNTO);

  if (toca) {
    if (!prohibidos) {
      const r = await api("/api/castigos/objetos-prohibidos");
      if (r.status !== 200) return;      // sin lista no se inventa una
      prohibidos = r.body.ids ?? [];
    }
    suyos.unshift({
      title: CONJUNTO,
      type: "custom",
      map: "any",
      mode: "any",
      priority: false,
      sortrank: 0,
      associatedMaps: [11, 12],
      associatedChampions: [],
      blocks: [{
        type: "Más de 3000 de oro — no los termines",
        items: prohibidos.map((id) => ({ id: String(id), count: 1 })),
      }],
    });
  }

  const ok = await lcu(`/lol-item-sets/v1/item-sets/${yo.summonerId}/sets`, {
    accountId: actual.accountId,
    itemSets: suyos,
  });
  if (!ok) return;                        // falló: que lo reintente en el siguiente sondeo

  conjuntoPuesto = toca;
  console.log(`  [conjunto] ${toca ? "puesto" : "retirado"}`);
}

async function vigilar() {
  const fase = await lcu("/lol-gameflow/v1/gameflow-phase");
  const anterior = faseAnterior;
  if (fase !== faseAnterior) faseAnterior = fase;

  if (fase !== "Lobby" && fase !== "Matchmaking" && fase !== "ChampSelect") {
    avisadoEnCola = false;
    ultimoProblema = null;
    reportadoAutofill = false;
    posicionEnCola = null;
    return;
  }

  const inbox = await api("/api/me/inbox");
  const reto = (inbox.body?.retos ?? []).find((r) => r.key);
  if (!reto) return;

  // ── Autofill ──────────────────────────────────────────────────────────────
  // Va aparte del resto porque el aviso y el veredicto caen en momentos
  // distintos: la posición se elige en el lobby, se congela al buscar partida,
  // y solo cuenta si la búsqueda llega a selección de campeón. Buscar y
  // cancelar no es jugar, así que no se juzga.
  if (reto.key === "autofill" && reto.status === "accepted") {
    if (fase === "Lobby") {
      // Volver al lobby es cancelar la cola: rearma el reporte, o cambiar la
      // posición y volver a buscar pasaría sin comprobarse.
      reportadoAutofill = false;

      const lobby = await lcu("/lol-lobby/v2/lobby");
      const problema = problemaAutofill(lobby?.localMember?.firstPositionPreference);
      if (problema && problema !== ultimoProblema) {
        avisar(`Vas a incumplir: ${reto.title}`, `${problema}. Cámbialo antes de buscar partida.`);
      }
      ultimoProblema = problema;
    }

    // Se guarda al buscar partida, que es cuando la elección se congela. En
    // selección ya no se puede leer de forma fiable: el lobby se está
    // deshaciendo, y lo que diga entonces no es lo que se pidió.
    if (fase === "Matchmaking" && anterior === "Lobby") {
      const lobby = await lcu("/lol-lobby/v2/lobby");
      posicionEnCola = lobby?.localMember?.firstPositionPreference ?? null;
    }

    // El veredicto, al entrar en selección: es lo que confirma que la búsqueda
    // acabó en partida.
    if (fase === "ChampSelect" && posicionEnCola && !reportadoAutofill) {
      reportadoAutofill = true;
      await api("/api/castigos/report", { type: "queue_positions", firstPosition: posicionEnCola })
        .catch(() => {});  // el aviso de cumplido o incumplido lo manda el servidor
    }
  }

  if (fase === "Lobby") return;  // el resto de castigos no se ven hasta selección

  if (fase === "Matchmaking" && !avisadoEnCola) {
    avisadoEnCola = true;
    avisar(
      reto.status === "pending" ? `Castigo sin decidir: ${reto.title}` : `Tienes un castigo: ${reto.title}`,
      reto.status === "pending"
        ? "Hasta que lo aceptes o lo rechaces, tus partidas no cuentan para el torneo."
        : reto.description ?? "",
      true,
      // Solo el que está sin decidir lleva a algún sitio: en el ya aceptado no
      // hay nada que pulsar, y hacerlo pulsable sería prometer un botón que no
      // existe.
      reto.status === "pending" ? fichaDelCastigo(reto) : null
    );
    return;
  }

  if (fase !== "ChampSelect") return;

  const cs = await lcu("/lol-champ-select/v1/session");
  const yo = cs?.myTeam?.find((m) => m.cellId === cs.localPlayerCellId);
  if (!yo) return;

  // Mismas reglas que usa el servidor para verificar; duplicarlas aquí las
  // separaría del catálogo a la primera que cambie una.
  const hechizos = [yo.spell1Id, yo.spell2Id];
  const problema =
    reto.key === "sin_flash" && hechizos.includes(4) ? "Llevas Destello" :
    reto.key === "sin_prender" && hechizos.includes(14) ? "Llevas Prender" :
    reto.key === "campeon_aleatorio" && reto.params?.campeon && yo.championId
      ? `Te tocaba ${reto.params.campeon}` : null;

  // Solo cuando cambia: si no, avisaría cada dos segundos mientras siga mal.
  if (problema && problema !== ultimoProblema) {
    avisar(`Vas a incumplir: ${reto.title}`, `${problema}. Cámbialo antes de que empiece la partida.`);
  }
  ultimoProblema = problema;
}

// ── Cliente de League ───────────────────────────────────────────────────────
const LOCKFILES = [
  "C:/Riot Games/League of Legends/lockfile",
  "D:/Riot Games/League of Legends/lockfile",
];

function lcu(ruta, cuerpo) {
  // El puerto y la contraseña cambian en cada arranque del cliente: se relee
  // siempre, nunca se cachea.
  const lock = LOCKFILES.find(existsSync);
  if (!lock) return Promise.resolve(null);
  const [, , port, pass] = readFileSync(lock, "utf8").trim().split(":");
  const datos = cuerpo === undefined ? null : JSON.stringify(cuerpo);

  return new Promise((resolve) => {
    const req = httpsRequest(
      {
        host: "127.0.0.1",
        port,
        path: ruta,
        method: datos ? "PUT" : "GET",
        headers: {
          Authorization: "Basic " + Buffer.from(`riot:${pass}`).toString("base64"),
          ...(datos ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(datos) } : {}),
        },
        // Certificado autofirmado contra tu propia máquina. La excepción es
        // solo para esta petición, no global.
        rejectUnauthorized: false,
      },
      (res) => {
        let d = "";
        res.on("data", (x) => (d += x));
        res.on("end", () => {
          // Al escribir vale cualquier 2xx, y algunas rutas contestan sin
          // cuerpo: se devuelve `true` para poder distinguirlo de un fallo.
          const bien = res.statusCode >= 200 && res.statusCode < 300;
          if (!bien) return resolve(null);
          try { resolve(JSON.parse(d)); } catch { resolve(datos ? true : null); }
        });
      }
    );
    req.on("error", () => resolve(null));
    if (datos) req.write(datos);
    req.end();
  });
}

const FASES = {
  None: "En el cliente", Lobby: "En el lobby", Matchmaking: "Buscando partida",
  ReadyCheck: "Partida encontrada", ChampSelect: "Selección de campeón",
  InProgress: "En partida", WaitingForStats: "Terminando", EndOfGame: "Fin de partida",
};

async function estadoJuego() {
  const fase = await lcu("/lol-gameflow/v1/gameflow-phase");
  if (!fase) return { conectado: false, texto: "League cerrado" };

  const estado = { conectado: true, fase, texto: FASES[fase] ?? fase, hechizos: null, campeon: null };

  if (fase === "ChampSelect") {
    const cs = await lcu("/lol-champ-select/v1/session");
    const yo = cs?.myTeam?.find((m) => m.cellId === cs.localPlayerCellId);
    if (yo) {
      estado.hechizos = [yo.spell1Id, yo.spell2Id];
      estado.campeon = yo.championId || null;
    }
  }
  return estado;
}

const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO}`);
  const json = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));
  };

  // ── API local ─────────────────────────────────────────────────────────────
  if (url.pathname === "/local/estado") {
    if (!sesion) return json(200, { sesion: false });
    const me = await api("/api/me");
    if (me.status === 401) { guardar(null); return json(200, { sesion: false }); }
    // Al entrar por navegador no llega el correo en la respuesta: se toma del
    // perfil la primera vez y se guarda para los arranques siguientes.
    if (!sesion.email && me.body?.email) guardar({ ...sesion, email: me.body.email });
    return json(200, { sesion: true, email: sesion.email ?? me.body?.username, perfil: me.body });
  }

  // Abre el navegador en la web para que el usuario inicie sesión allí. Ni la
  // contraseña ni el captcha pasan por el cliente.
  if (url.pathname === "/local/abrir-login" && req.method === "POST") {
    esperando = randomUUID();
    const destino = `${API}/es/client-auth?port=${PUERTO}&state=${esperando}`;
    // `start ""` para que cmd no interprete la URL como título de ventana.
    exec(`start "" "${destino}"`, { shell: "cmd.exe" });
    return json(200, { abierto: destino });
  }

  if (url.pathname === "/callback") {
    const recibido = url.searchParams.get("state");
    if (!esperando || recibido !== esperando) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      return res.end("<h2>Peticion no reconocida</h2><p>Vuelve a pulsar Entrar en el cliente.</p>");
    }
    esperando = null; // un solo uso

    guardar({
      token: url.searchParams.get("access_token"),
      refresh: url.searchParams.get("refresh_token"),
      expira: Number(url.searchParams.get("expires_at")) * 1000,
      email: null, // lo rellena /api/me en el primer estado
    });

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(
      '<!doctype html><meta charset="utf-8">' +
        '<body style="font:15px system-ui;background:#0b0e14;color:#e8ecf4;display:grid;place-items:center;height:100vh;margin:0">' +
        "<div style=\"text-align:center\"><h2>Sesion conectada</h2>" +
        "<p>Ya puedes cerrar esta pestana y volver al cliente.</p></div>"
    );
  }

  if (url.pathname === "/local/entrar" && req.method === "POST") {
    let cuerpo = "";
    req.on("data", (d) => (cuerpo += d));
    return req.on("end", async () => {
      const { email, password } = JSON.parse(cuerpo || "{}");
      if (!email || !password) return json(400, { error: "Faltan correo y contraseña" });
      const r = await entrar(email, password);
      json(r.error ? 401 : 200, r);
    });
  }

  if (url.pathname === "/local/salir" && req.method === "POST") {
    guardar(null);
    return json(200, { ok: true });
  }

  if (url.pathname === "/local/inbox") {
    const r = await api("/api/me/inbox");
    return json(r.status, r.body);
  }

  // Estado del cliente de League. Es lo único que la web no puede saber, y por
  // tanto lo que justifica que esto sea una aplicación y no una pestaña.
  // Para ver cómo queda un aviso sin tener que provocar la situación real:
  // esperar a que alguien te lance un castigo para revisar el diseño no es
  // manera de trabajar. Acepta título y cuerpo, o repite el de siempre.
  if (url.pathname === "/local/probar-aviso") {
    // Con ?accion=1 sale pulsable y lleva al castigo que tengas ahora, para
    // poder probar el recorrido entero sin que nadie te lance nada.
    let destino = null;
    if (url.searchParams.get("accion") === "1") {
      const inbox = await api("/api/me/inbox");
      destino = fichaDelCastigo((inbox.body?.retos ?? [])[0]);
    }
    avisar(
      url.searchParams.get("titulo") || "Vas a incumplir: Sin Flash",
      url.searchParams.get("cuerpo") ?? "Llevas Destello. Cámbialo antes de que empiece la partida.",
      url.searchParams.get("urgente") !== "0",
      destino
    );
    return json(200, { ok: true, destino });
  }

  // La sesión para la web incrustada. Sin esto pediría iniciar sesión otra vez
  // dentro de la aplicación: la sesión del cliente es un token nuestro, y la
  // web se maneja por cookies suyas — dos sitios distintos.
  //
  // Solo escucha en 127.0.0.1 y no manda cabeceras CORS, así que ninguna
  // página de fuera puede leer esta respuesta.
  if (url.pathname === "/local/sesion-web") {
    const t = await token();   // renueva si le queda poco
    if (!t || !sesion) return json(401, { error: "Sin sesión" });
    return json(200, { access_token: t, refresh_token: sesion.refresh });
  }

  // La barra pide montar u ocultar la vista de la web. Fuera de Electron no
  // hay vista que mover y no pasa nada: el servidor también corre suelto.
  if (url.pathname === "/local/vista" && req.method === "POST") {
    const v = globalThis.__srankVista;
    if (!v) return json(200, { ok: false, motivo: "sin ventana" });
    if (url.searchParams.get("montar")) v.montar(url.searchParams.get("montar"));
    if (url.searchParams.has("ver")) v.ver(url.searchParams.get("ver") === "1");
    return json(200, { ok: true });
  }

  // El catálogo, para la ruleta del overlay. Va por aquí y no directo a la web
  // porque este es el único que tiene la sesión.
  if (url.pathname === "/local/castigos") {
    const r = await api("/api/castigos/catalogo");
    return json(r.status, r.body);
  }

  if (url.pathname === "/local/probar-clic") {
    const f = globalThis.__srankClicAviso;
    return json(200, f ? f() : { error: "sin ventana" });
  }

  if (url.pathname === "/local/juego") {
    return json(200, await estadoJuego());
  }

  // Pasarela para el overlay: pide aquí y esto lo reenvía a la web, que es
  // quien tiene la clave de Riot. Así el overlay no guarda credenciales de
  // ningún tipo y el streamer no tiene que renovar nada cada 24 horas.
  if (url.pathname === "/local/riot") {
    const destino = url.searchParams.get("url");
    if (!destino) return json(400, { error: "Falta url" });

    const t = await token();
    if (!t) return json(401, { error: "Sin sesión" });

    const arriba = await fetch(`${API}/api/riot/proxy?url=${encodeURIComponent(destino)}`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    const cuerpo = await arriba.text();

    // Se conserva el estado: el overlay distingue un 404 (sin rango) de un 429
    // (límite), y aplanarlo aquí le quitaría esa información.
    res.writeHead(arriba.status, { "Content-Type": "application/json" });
    return res.end(cuerpo);
  }

  // La dirección de la web, para incrustarla sin tenerla escrita en el HTML.
  if (url.pathname === "/local/config") {
    return json(200, { api: API, overlay: OVERLAY_URL });
  }

  // Clasificación del torneo del jugador, para el overlay. El overlay no sabe
  // en cuál está inscrito ni tiene sesión: se resuelve aquí.
  if (url.pathname === "/local/leaderboard") {
    const inbox = await api("/api/me/inbox");
    const torneo = (inbox.body?.torneos ?? [])[0];
    if (!torneo) return json(200, { jugadores: [], torneo: null });

    const res = await fetch(`${API}/api/tournaments/${torneo.id}/leaderboard`);
    const cuerpo = await res.json().catch(() => ({ jugadores: [] }));
    return json(200, { ...cuerpo, torneo: torneo.title });
  }

  // Arranca el overlay de streamer. Se pide desde la interfaz al abrir esa
  // pestaña, no al iniciar el cliente: quien no es streamer nunca levanta un
  // servidor que no va a usar.
  if (url.pathname === "/local/overlay" && req.method === "POST") {
    const permitido = await esStreamer();
    if (!permitido) return json(403, { error: "Necesitas el distintivo de streamer" });
    return json(200, await arrancarOverlay());
  }

  // ── Estáticos ─────────────────────────────────────────────────────────────
  const ruta = url.pathname === "/" ? "/index.html" : url.pathname;
  const fichero = join(RAIZ, "src", ruta);
  if (!fichero.startsWith(join(RAIZ, "src"))) return json(403, { error: "Fuera de sitio" });
  if (!existsSync(fichero)) return json(404, { error: "No encontrado" });

  // Sin caché: el cliente se actualiza con el propio programa, y una versión
  // vieja de main.js guardada por el navegador hace que un arreglo parezca no
  // haber funcionado.
  res.writeHead(200, {
    "Content-Type": TIPOS[extname(fichero)] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  res.end(readFileSync(fichero));
});

server.listen(PUERTO, "127.0.0.1", () => {
  console.log(`\n  S-Rank Arena — cliente\n  http://localhost:${PUERTO}\n`);
  console.log(`  API: ${API}`);
  console.log(sesion ? `  Sesión guardada: ${sesion.email}` : "  Sin sesión iniciada");
});

// Cada 2 s, igual que la barra: los cambios de fase del juego duran segundos y
// perderse la entrada en cola es perderse el único momento útil del aviso.
setInterval(() => { vigilar().catch(() => {}); }, 2000);

/**
 * El conjunto de objetos va por su cuenta y no dentro de `vigilar()`, que solo
 * mira en cola y en selección. Aquí hace falta lo contrario: ponerlo mientras
 * el jugador está en el menú, que es cuando aún puede mirárselo, y no cuando ya
 * está eligiendo campeón.
 *
 * Cada 30 s: esto no cambia hasta que alguien acepta o resuelve un castigo.
 */
async function repasarConjunto() {
  const inbox = await api("/api/me/inbox");
  if (inbox.status !== 200) return;
  await sincronizarConjunto((inbox.body?.retos ?? []).find((r) => r.key));
}
repasarConjunto().catch(() => {});
setInterval(() => { repasarConjunto().catch(() => {}); }, 30000);

// Lo importa main.js (la ventana de Electron) para esperar a que escuche antes
// de cargar la interfaz: sin eso la ventana abre contra un puerto muerto.
export default server;
