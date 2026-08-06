// Ventana de Electron. No reescribe nada: importa el servidor local tal cual y
// carga su interfaz. Mismo patrón que el overlay, que ya funcionaba así.
//
// Electron y no Tauri porque Tauri necesita el SDK de Windows para enlazar y
// nunca llegó a compilar; y porque empaquetar con Electron mete Node dentro,
// así que el streamer no tiene que instalar nada aparte.
const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("node:path");

const PUERTO = Number(process.env.SRANK_PORT ?? 8788);
const URL_LOCAL = `http://localhost:${PUERTO}`;

let ventana = null;
let aviso = null;

const ANCHO_AVISO = 380;
const ALTO_AVISO = 104;

/**
 * Aviso propio: ventana sin marco, siempre encima y transparente.
 *
 * Los globos de Windows no se pueden maquillar —son los del sistema y punto—,
 * y encima de la partida no valen. Esto además es la base del aviso en juego:
 * con League en ventana sin bordes, se ve por encima.
 */
function mostrarAviso(titulo, cuerpo, urgente) {
  const { screen } = require("electron");
  const pantalla = screen.getPrimaryDisplay().workArea;

  if (!aviso || aviso.isDestroyed()) {
    aviso = new BrowserWindow({
      width: ANCHO_AVISO,
      height: ALTO_AVISO,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      skipTaskbar: true,      // no aparece en la barra de tareas
      focusable: false,       // no roba el foco: robarlo en partida es fatal
      alwaysOnTop: true,
      show: false,
    });
    // Por encima incluso de ventanas a pantalla completa sin bordes.
    aviso.setAlwaysOnTop(true, "screen-saver");
    aviso.setIgnoreMouseEvents(true);
  }

  aviso.setBounds({
    x: pantalla.x + pantalla.width - ANCHO_AVISO - 18,
    y: pantalla.y + 18,
    width: ANCHO_AVISO,
    height: ALTO_AVISO,
  });

  const params = new URLSearchParams({
    titulo,
    cuerpo: cuerpo ?? "",
    urgente: urgente ? "1" : "0",
  });
  aviso.loadFile(path.join(__dirname, "src", "aviso.html"), { search: params.toString() });
  aviso.showInactive();  // se muestra sin quitar el foco al juego

  // La propia página avisa por el hash cuando termina de irse.
  aviso.webContents.removeAllListeners("did-navigate-in-page");
  aviso.webContents.on("did-navigate-in-page", (_e, url) => {
    if (url.endsWith("#fin") && aviso && !aviso.isDestroyed()) aviso.hide();
  });
}

function crearVentana() {
  ventana = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0b0e14",
    autoHideMenuBar: true,
    title: "S-Rank Arena",
    webPreferences: {
      // La interfaz no necesita Node: todo lo hace por HTTP contra el servidor
      // local. Dejarlo apagado evita que una web incrustada llegue al sistema.
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  ventana.loadURL(URL_LOCAL);

  // Los enlaces externos se abren en el navegador de verdad, no en una ventana
  // de la aplicación sin barra de direcciones —donde nadie puede comprobar a
  // dónde ha ido a parar—.
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(URL_LOCAL)) shell.openExternal(url);
    return { action: "deny" };
  });

  ventana.on("closed", () => { ventana = null; });
}

// Una sola instancia: dos abriendo el mismo puerto es un error de arranque que
// el usuario ve como "no abre".
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!ventana) return;
    if (ventana.isMinimized()) ventana.restore();
    ventana.focus();
  });

  app.whenReady().then(async () => {
    // La carpeta del programa no es escribible una vez instalado; la sesión y
    // la configuración del overlay van a la de datos de usuario.
    process.env.SRANK_DATA_DIR = app.getPath("userData");

    // El servidor no puede importar Electron: también se ejecuta suelto con
    // node para desarrollo, y ahí `require("electron")` no existe. Se le deja
    // esta función y él la usa si está.
    globalThis.__srankAvisar = mostrarAviso;

    const { default: servidor } = await import("./server.mjs");
    await new Promise((listo) =>
      servidor.listening ? listo() : servidor.once("listening", listo)
    );

    Menu.setApplicationMenu(null);
    crearVentana();
  });

  app.on("window-all-closed", () => app.quit());
}
