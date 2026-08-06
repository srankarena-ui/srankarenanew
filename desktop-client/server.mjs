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
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { exec } from "node:child_process";
import { request as httpsRequest } from "node:https";
import { fileURLToPath } from "node:url";

const RAIZ = dirname(fileURLToPath(import.meta.url));
const PUERTO = Number(process.env.SRANK_PORT ?? 8788);
const API = process.env.SRANK_API ?? "https://www.srankarena.com";
const SESION = join(RAIZ, "sesion.json");

// Estas dos son públicas por diseño: la anon key va en el HTML de cualquier
// página de Supabase. La service role no aparece aquí ni puede aparecer.
const SUPABASE_URL = process.env.SRANK_SUPABASE_URL ?? "https://iucvkkujwtsxeefkagiw.supabase.co";
const SUPABASE_ANON = process.env.SRANK_SUPABASE_ANON ?? "";

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
async function api(ruta) {
  const t = await token();
  if (!t) return { status: 401, body: { error: "Sin sesión" } };
  const res = await fetch(`${API}${ruta}`, { headers: { Authorization: `Bearer ${t}` } });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

// ── Cliente de League ───────────────────────────────────────────────────────
const LOCKFILES = [
  "C:/Riot Games/League of Legends/lockfile",
  "D:/Riot Games/League of Legends/lockfile",
];

function lcu(ruta) {
  // El puerto y la contraseña cambian en cada arranque del cliente: se relee
  // siempre, nunca se cachea.
  const lock = LOCKFILES.find(existsSync);
  if (!lock) return Promise.resolve(null);
  const [, , port, pass] = readFileSync(lock, "utf8").trim().split(":");

  return new Promise((resolve) => {
    const req = httpsRequest(
      {
        host: "127.0.0.1",
        port,
        path: ruta,
        headers: { Authorization: "Basic " + Buffer.from(`riot:${pass}`).toString("base64") },
        // Certificado autofirmado contra tu propia máquina. La excepción es
        // solo para esta petición, no global.
        rejectUnauthorized: false,
      },
      (res) => {
        let d = "";
        res.on("data", (x) => (d += x));
        res.on("end", () => {
          if (res.statusCode !== 200) return resolve(null);
          try { resolve(JSON.parse(d)); } catch { resolve(null); }
        });
      }
    );
    req.on("error", () => resolve(null));
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
  if (url.pathname === "/local/juego") {
    return json(200, await estadoJuego());
  }

  // La dirección de la web, para incrustarla sin tenerla escrita en el HTML.
  if (url.pathname === "/local/config") {
    return json(200, { api: API });
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
  console.log("\n  Deja esta ventana abierta. Ctrl+C para cerrar.\n");
});
