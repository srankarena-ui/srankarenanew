// Avisa con sonido cuando el jugador entra en cola llevando un castigo, y en
// selección de campeón si está a punto de incumplirlo.
//
// Prototipo funcional de lo que hará el cliente de escritorio: misma lógica,
// mismos endpoints, y la comprobación de selección sale de `castigos.ts` para
// que el aviso y la verificación no se separen nunca.
//
//   SRANK_EMAIL=... SRANK_PASSWORD=... node --experimental-strip-types scripts/lcu-notify.mjs
//   node --experimental-strip-types scripts/lcu-notify.mjs --test
//
// Se autentica con la cuenta del jugador contra Supabase y usa su JWT. NO usa
// la service role: esto acaba en la máquina de cada participante, y repartir esa
// clave sería regalar la base entera.
import { readFileSync, existsSync } from "node:fs";
import { request } from "node:https";
import { execFile } from "node:child_process";
import { problemaEnSeleccion, nombreHechizo } from "../src/core/lib/castigos.ts";

const API = process.env.SRANK_API ?? "http://localhost:3000";
const SONDEO_MS = 1000;

// ── Aviso de Windows con sonido ─────────────────────────────────────────────
function avisar(titulo, cuerpo, urgente = false) {
  // Globo del área de notificación: sale como notificación del sistema en
  // Windows 10 y 11 sin instalar nada. El sonido va aparte, el globo es mudo.
  const ps = `
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
[System.Media.SystemSounds]::${urgente ? "Exclamation" : "Asterisk"}.Play()
$n = New-Object System.Windows.Forms.NotifyIcon
$n.Icon = [System.Drawing.SystemIcons]::${urgente ? "Warning" : "Information"}
$n.BalloonTipTitle = ${JSON.stringify(titulo)}
$n.BalloonTipText  = ${JSON.stringify(cuerpo)}
$n.Visible = $true
$n.ShowBalloonTip(15000)
Start-Sleep -Seconds 8
$n.Dispose()`;
  execFile("powershell", ["-NoProfile", "-WindowStyle", "Hidden", "-Command", ps], () => {});
  console.log(`\n  🔔 ${titulo}\n     ${cuerpo}\n`);
}

if (process.argv.includes("--test")) {
  avisar("Vas a incumplir: Sin Prender", "Llevas Prender. Cámbialo antes de que empiece la partida.", true);
  process.exit(0);
}

// ── LCU ─────────────────────────────────────────────────────────────────────
const RUTAS = [
  "C:/Riot Games/League of Legends/lockfile",
  "D:/Riot Games/League of Legends/lockfile",
];

function lcu(path) {
  // El puerto y la contraseña cambian en cada arranque del cliente: se relee
  // siempre, nunca se cachea.
  const ruta = RUTAS.find(existsSync);
  if (!ruta) return Promise.resolve(null);
  const [, , port, pass] = readFileSync(ruta, "utf8").trim().split(":");
  const auth = "Basic " + Buffer.from(`riot:${pass}`).toString("base64");

  return new Promise((resolve) => {
    const req = request(
      { host: "127.0.0.1", port, path, headers: { Authorization: auth }, rejectUnauthorized: false },
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

// ── Sesión del jugador ──────────────────────────────────────────────────────
function env(nombre) {
  if (process.env[nombre]) return process.env[nombre];
  if (!existsSync(".env.local")) return null;
  const l = readFileSync(".env.local", "utf8").split(/\r?\n/).find((x) => x.startsWith(nombre + "="));
  return l ? l.slice(l.indexOf("=") + 1).trim() : null;
}

const SB = env("NEXT_PUBLIC_SUPABASE_URL");
const ANON = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");

async function iniciarSesion() {
  const email = process.env.SRANK_EMAIL, password = process.env.SRANK_PASSWORD;
  if (!email || !password) {
    console.error("Faltan SRANK_EMAIL y SRANK_PASSWORD.");
    process.exit(1);
  }
  const res = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    console.error("No se pudo iniciar sesión:", (await res.text()).slice(0, 200));
    process.exit(1);
  }
  const j = await res.json();
  return { token: j.access_token, refresh: j.refresh_token, usuario: j.user?.email };
}

let sesion = await iniciarSesion();
console.log(`Sesión iniciada: ${sesion.usuario}`);

// El token de Supabase caduca en una hora; una sesión de stream dura más.
async function renovar() {
  const res = await fetch(`${SB}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: sesion.refresh }),
  });
  if (!res.ok) return;
  const j = await res.json();
  sesion = { ...sesion, token: j.access_token, refresh: j.refresh_token };
}
setInterval(renovar, 45 * 60_000);

/** El castigo activo de ESTA cuenta. Sin castigo, el vigilante calla. */
async function castigoActivo() {
  const res = await fetch(`${API}/api/me/inbox`, { headers: { Authorization: `Bearer ${sesion.token}` } });
  if (!res.ok) return null;
  const { retos } = await res.json();
  return (retos ?? []).find((r) => r.key) ?? null;
}

// ── Vigilancia ──────────────────────────────────────────────────────────────
console.log(`Vigilando el cliente. API: ${API}. Ctrl+C para salir.\n`);

let faseAnterior = null;
let avisadoEnCola = false;
let ultimoProblema = null;

setInterval(async () => {
  const fase = await lcu("/lol-gameflow/v1/gameflow-phase");
  if (fase !== faseAnterior) {
    console.log(new Date().toLocaleTimeString(), fase ?? "(cliente cerrado)");
    faseAnterior = fase;
  }

  if (fase === "Lobby" || fase === "None" || fase === null) {
    avisadoEnCola = false;
    ultimoProblema = null;
    return;
  }

  const reto = await castigoActivo();
  if (!reto) return; // sin castigo, ni un aviso

  // Al entrar en cola: recordarle lo que lleva encima, mientras aún puede
  // planear con qué hechizos y campeón va a ir.
  if (fase === "Matchmaking" && !avisadoEnCola) {
    avisadoEnCola = true;
    if (reto.status === "pending") {
      avisar(
        `Castigo sin decidir: ${reto.title}`,
        "Hasta que lo aceptes o lo rechaces, tus partidas no cuentan para el torneo.",
        true
      );
    } else {
      avisar(`Tienes un castigo: ${reto.title}`, reto.description ?? "", true);
    }
  }

  // En selección: avisar si lo va a incumplir, que es cuando todavía está a
  // tiempo. Enterarse después es enterarse con los puntos ya restados.
  if (fase === "ChampSelect") {
    const cs = await lcu("/lol-champ-select/v1/session");
    const yo = cs?.myTeam?.find((m) => m.cellId === cs.localPlayerCellId);
    if (!yo) return;

    const campeones = await catalogoCampeones();
    const problema = problemaEnSeleccion(reto.key, reto.params ?? {}, {
      hechizos: [yo.spell1Id, yo.spell2Id],
      campeon: campeones.get(yo.championId) ?? null,
    });

    console.log(
      `  ${nombreHechizo(yo.spell1Id)} / ${nombreHechizo(yo.spell2Id)}` +
      (yo.championId ? ` · ${campeones.get(yo.championId) ?? yo.championId}` : "") +
      (problema ? `  ← ${problema}` : "  ✓")
    );

    // Solo al cambiar: si no, avisaría cada segundo mientras siga mal.
    if (problema && problema !== ultimoProblema) {
      avisar(
        `Vas a incumplir: ${reto.title}`,
        `${problema}. Cámbialo antes de que empiece la partida o pierdes 100 puntos.`,
        true
      );
    }
    ultimoProblema = problema;
  }
}, SONDEO_MS);

let campeonesCache = null;
async function catalogoCampeones() {
  campeonesCache ??= (async () => {
    const v = (await fetch("https://ddragon.leagueoflegends.com/api/versions.json").then((r) => r.json()))[0];
    const data = (await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/en_US/champion.json`).then((r) => r.json())).data;
    return new Map(Object.values(data).map((c) => [Number(c.key), c.id]));
  })();
  return campeonesCache;
}
