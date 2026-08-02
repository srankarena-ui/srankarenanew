const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

const $ = (id) => document.getElementById(id);

const DOT_COLORS = {
  logged_out: "#6b7280",
  waiting: "#eab308",
  in_game: "#22c55e",
  completed: "#22c55e",
  error: "#ef4444",
};

function showApp(email) {
  $("account-email").textContent = email;
  $("login").hidden = true;
  $("app").hidden = false;
}

$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("login-button");
  button.disabled = true;
  $("login-error").textContent = "";

  try {
    const email = await invoke("login", {
      email: $("email").value,
      password: $("password").value,
    });
    $("password").value = "";
    showApp(email);
  } catch (err) {
    $("login-error").textContent = String(err);
  } finally {
    button.disabled = false;
  }
});

$("logout").addEventListener("click", async () => {
  await invoke("logout");
  $("app").hidden = true;
  $("login").hidden = false;
});

$("autostart").addEventListener("change", (event) => {
  invoke("set_autostart", { enabled: event.target.checked });
});

listen("status", ({ payload }) => {
  $("status-dot").style.background = DOT_COLORS[payload.state] ?? "#6b7280";
  $("status-text").textContent = payload.detail;

  // Los retos cumplidos se acumulan en la lista; el resto solo cambia el estado.
  if (payload.state === "completed") {
    const item = document.createElement("li");
    item.textContent = payload.detail;
    $("log").prepend(item);
  }
});

// Cerrar la ventana está interceptado en Rust: aquí solo se confirma.
listen("confirm-close", () => {
  $("confirm").hidden = false;
});

$("stay").addEventListener("click", () => {
  $("confirm").hidden = true;
});

$("quit").addEventListener("click", () => {
  invoke("exit_app");
});

(async () => {
  $("autostart").checked = await invoke("autostart_enabled");
  const email = await invoke("current_email");
  if (email) showApp(email);
})();
