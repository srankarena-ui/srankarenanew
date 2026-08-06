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

    const { default: servidor } = await import("./server.mjs");
    await new Promise((listo) =>
      servidor.listening ? listo() : servidor.once("listening", listo)
    );

    Menu.setApplicationMenu(null);
    crearVentana();
  });

  app.on("window-all-closed", () => app.quit());
}
