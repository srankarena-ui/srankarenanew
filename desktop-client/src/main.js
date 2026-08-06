// Interfaz del cliente. Habla con el servidor local (server.mjs), que guarda la
// sesión y pone el token en cada llamada a la web: el JWT nunca llega aquí.
//
// La web va incrustada tal cual, sin replicarla: cambia cada semana y mantener
// dos versiones las separa solas. Lo que aporta el cliente no es interfaz sino
// acceso —al cliente de League, a los avisos, al overlay— y eso vive en la
// barra de arriba, que es lo que un navegador no puede darte.
const $ = (id) => document.getElementById(id);

async function local(ruta, opciones) {
  const res = await fetch(ruta, opciones);
  return { ok: res.ok, body: await res.json().catch(() => ({})) };
}

// ── Entrada ─────────────────────────────────────────────────────────────────
// El login ocurre en el navegador: Supabase exige captcha fuera de la web, y
// así la contraseña nunca pasa por el cliente.
let sondeoLogin = null;

$("login-button").addEventListener("click", async () => {
  const boton = $("login-button");
  boton.disabled = true;
  boton.textContent = "Abriendo el navegador…";
  $("login-error").textContent = "";
  $("login-hint").hidden = false;

  const { body } = await local("/local/abrir-login", { method: "POST" });
  if (body.error) {
    boton.disabled = false;
    boton.textContent = "Entrar";
    $("login-error").textContent = body.error;
    return;
  }

  clearInterval(sondeoLogin);
  sondeoLogin = setInterval(async () => {
    const { body } = await local("/local/estado");
    if (!body.sesion) return;
    clearInterval(sondeoLogin);
    boton.disabled = false;
    boton.textContent = "Entrar";
    $("login-hint").hidden = true;
    arrancar();
  }, 1500);
});

$("logout").addEventListener("click", async () => {
  await local("/local/salir", { method: "POST" });
  arrancar();
});

// ── Pintado ─────────────────────────────────────────────────────────────────
function mostrarLogin() {
  $("login").hidden = false;
  $("app").hidden = true;
}

async function mostrarSesion({ email, perfil }) {
  $("login").hidden = true;
  $("app").hidden = false;

  $("account-email").textContent = perfil?.username || email || "";
  $("badge-streamer").hidden = !perfil?.is_streamer;

  // Se carga una sola vez: recargarla en cada sondeo perdería lo que el usuario
  // esté haciendo dentro.
  const marco = $("web");
  if (!marco.src) {
    const { body } = await local("/local/config");
    marco.src = `${body.api}/es/tournaments`;
  }
}

async function refrescarCastigo() {
  const { ok, body } = await local("/local/inbox");
  const caja = $("castigo");
  if (!ok) return;

  const reto = (body.retos ?? [])[0];
  caja.hidden = !reto;
  if (!reto) return;

  $("castigo-nombre").textContent = reto.title;
  $("castigo-estado").textContent =
    reto.status === "pending" ? "sin decidir · tus partidas no cuentan" : "acéptalo en tu próxima partida";
}

async function refrescarJuego() {
  const { body } = await local("/local/juego");
  const punto = $("punto-juego");

  $("texto-juego").textContent = body.texto ?? "League cerrado";
  punto.className = "punto";
  if (body.conectado) punto.classList.add(body.fase === "InProgress" ? "jugando" : "vivo");
}

async function arrancar() {
  const { body } = await local("/local/estado");
  if (!body.sesion) return mostrarLogin();
  await mostrarSesion(body);
  refrescarCastigo();
  refrescarJuego();
}

arrancar();

// El estado del juego cambia en segundos; el castigo, no. Sondeos distintos
// para no pedir a la web doce veces por minuto sin motivo.
setInterval(() => { if (!$("app").hidden) refrescarJuego(); }, 2000);
setInterval(() => { if (!$("app").hidden) refrescarCastigo(); }, 15000);
