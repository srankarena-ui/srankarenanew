// Lee el cliente de League y reporta lo que ninguna API pública expone.
// Es la referencia de lo que tendrá que hacer el cliente de escritorio: probado
// contra un cliente real antes de escribirlo en Rust.
//
//   node scripts/lcu-watch.mjs            → vigila y muestra los cambios de fase
//   node scripts/lcu-watch.mjs --once     → una lectura y sale
//
// La LCU usa HTTPS con certificado autofirmado contra 127.0.0.1. Se desactiva la
// verificación solo en esta petición, no con NODE_TLS_REJECT_UNAUTHORIZED, que
// la desactivaría para todo el proceso —incluidas las llamadas a Supabase—.
import { readFileSync, existsSync } from "node:fs";
import { request } from "node:https";

const RUTAS = [
  "C:/Riot Games/League of Legends/lockfile",
  "D:/Riot Games/League of Legends/lockfile",
];

function credenciales() {
  const ruta = RUTAS.find(existsSync);
  if (!ruta) return null;
  // El puerto y la contraseña cambian en cada arranque del cliente: hay que
  // releer el fichero, nunca cachearlo.
  const [, , port, pass] = readFileSync(ruta, "utf8").trim().split(":");
  return { port, auth: "Basic " + Buffer.from(`riot:${pass}`).toString("base64") };
}

function lcu(path) {
  const c = credenciales();
  if (!c) return Promise.resolve({ status: 0, body: null });

  return new Promise((resolve) => {
    const req = request(
      {
        host: "127.0.0.1",
        port: c.port,
        path,
        headers: { Authorization: c.auth },
        rejectUnauthorized: false,
      },
      (res) => {
        let data = "";
        res.on("data", (d) => (data += d));
        res.on("end", () => {
          let body = null;
          if (res.statusCode === 200) { try { body = JSON.parse(data); } catch {} }
          resolve({ status: res.statusCode, body });
        });
      }
    );
    req.on("error", () => resolve({ status: 0, body: null }));
    req.end();
  });
}

async function estado() {
  const [fase, lobby, champSelect] = await Promise.all([
    lcu("/lol-gameflow/v1/gameflow-phase"),
    lcu("/lol-lobby/v2/lobby"),
    lcu("/lol-champ-select/v1/session"),
  ]);

  const me = lobby.body?.localMember;
  const cs = champSelect.body;
  const yo = cs?.myTeam?.find((m) => m.cellId === cs.localPlayerCellId);

  return {
    fase: fase.body ?? "(cliente cerrado)",
    primera: me?.firstPositionPreference ?? null,
    segunda: me?.secondPositionPreference ?? null,
    cola: lobby.body?.gameConfig?.queueId ?? null,
    rolAsignado: yo?.assignedPosition || null,
    campeon: yo?.championId || null,
    hechizos: yo ? [yo.spell1Id, yo.spell2Id] : null,
  };
}

const once = process.argv.includes("--once");

if (once) {
  console.log(JSON.stringify(await estado(), null, 2));
} else {
  console.log("Vigilando el cliente. Ctrl+C para salir.\n");
  let anterior = null;
  let reportado = false;

  setInterval(async () => {
    const e = await estado();
    const clave = JSON.stringify(e);
    if (clave === anterior) return;
    anterior = clave;

    console.log(new Date().toLocaleTimeString(), e.fase,
      e.primera ? `· cola: ${e.primera}/${e.segunda ?? "—"}` : "",
      e.rolAsignado ? `· asignado: ${e.rolAsignado}` : "");

    // El momento que importa: al pasar a Matchmaking la elección se congela.
    if (e.fase === "Matchmaking" && !reportado) {
      reportado = true;
      console.log(`  → reportaría { type: "queue_positions", firstPosition: "${e.primera}" }`);
      console.log(`     castigo "Rellenar": ${e.primera === "FILL" ? "CUMPLIDO" : "INCUMPLIDO"}`);
    }
    if (e.fase === "Lobby") reportado = false;
  }, 1000);
}
