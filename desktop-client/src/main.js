// Interfaz del cliente. Habla con el servidor local (server.mjs), que es quien
// guarda la sesión y pone el token en cada llamada a la web: así el JWT nunca
// llega al navegador.
//
// Antes esto invocaba `window.__TAURI__`. Se cambió a HTTP porque Tauri no
// compila sin el SDK de Windows y el cliente llevaba meses sin poder arrancarse
// ni una vez. Envolverlo en Tauri más adelante no obliga a tocar este fichero:
// serviría el mismo HTML contra el mismo servidor local.
const $ = (id) => document.getElementById(id);

async function local(ruta, opciones) {
  const res = await fetch(ruta, opciones);
  return { ok: res.ok, body: await res.json().catch(() => ({})) };
}

// ── Sesión ──────────────────────────────────────────────────────────────────
$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const boton = $("login-button");
  boton.disabled = true;
  boton.textContent = "Entrando…";
  $("login-error").textContent = "";

  const { body } = await local("/local/entrar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: $("email").value, password: $("password").value }),
  });

  boton.disabled = false;
  boton.textContent = "Entrar";
  if (body.error) { $("login-error").textContent = body.error; return; }

  $("password").value = "";
  arrancar();
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

function mostrarSesion({ email, perfil }) {
  $("login").hidden = true;
  $("app").hidden = false;

  const nombre = perfil?.username || email;
  $("account-email").textContent = nombre;
  $("account-sub").textContent = email;

  // El apartado de streamer solo existe si un admin le dio el distintivo.
  const esStreamer = !!perfil?.is_streamer;
  $("badge-streamer").hidden = !esStreamer;
  $("streamer-si").hidden = !esStreamer;
  $("streamer-no").hidden = esStreamer;
}

async function cargarRetos() {
  const caja = $("retos");
  const { ok, body } = await local("/local/inbox");
  if (!ok) { caja.innerHTML = '<li class="hint">No se pudo consultar.</li>'; return; }

  const retos = body.retos ?? [];
  if (!retos.length) { caja.innerHTML = '<li class="hint">Sin castigos activos.</li>'; return; }

  caja.innerHTML = retos.map((r) => `
    <li>
      <strong>${r.title}</strong><br>
      <span class="hint">${r.description ?? ""}</span><br>
      <span class="${r.status === "pending" ? "error" : "hint"}">
        ${r.status === "pending"
          ? "Sin decidir · tus partidas no cuentan hasta que respondas"
          : "Aceptado · cúmplelo en tu próxima partida"}
      </span>
    </li>`).join("");
}

async function arrancar() {
  const { body } = await local("/local/estado");
  if (!body.sesion) return mostrarLogin();
  mostrarSesion(body);
  cargarRetos();
}

arrancar();
// 15 s basta para un castigo que se cumple en la siguiente partida: sondear más
// rápido no adelanta nada y multiplica las llamadas por cada cliente abierto.
setInterval(() => { if (!$("app").hidden) cargarRetos(); }, 15000);
