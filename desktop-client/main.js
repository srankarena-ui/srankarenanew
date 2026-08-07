// Ventana de Electron. No reescribe nada: importa el servidor local tal cual y
// carga su interfaz. Mismo patrón que el overlay, que ya funcionaba así.
//
// Electron y no Tauri porque Tauri necesita el SDK de Windows para enlazar y
// nunca llegó a compilar; y porque empaquetar con Electron mete Node dentro,
// así que el streamer no tiene que instalar nada aparte.
const { app, BrowserWindow, Menu, shell, WebContentsView } = require("electron");
const path = require("node:path");

const PUERTO = Number(process.env.SRANK_PORT ?? 8788);
const URL_LOCAL = `http://localhost:${PUERTO}`;

let ventana = null;
let aviso = null;
let destinoAviso = null;
let vistaWeb = null;

/** Alto de la barra propia, el mismo que dice `.barra` en style.css. */
const ALTO_BARRA = 52;

/**
 * La web va en una vista de Electron, no en un `<iframe>`.
 *
 * Dentro de un iframe la web es contenido de terceros: la página que lo
 * contiene es localhost y la de dentro es srankarena.com, así que las cookies
 * de sesión —que son `SameSite=Lax`, como debe ser— no se envían al servidor.
 * El resultado era una sesión a medias: la barra de navegación de la web te
 * reconocía, porque el navegador sí las lee desde su propio JavaScript, pero
 * todo lo que se pinta en el servidor te veía desconectado. De ahí el "inicia
 * sesión para unirte" con tu nombre arriba a la derecha.
 *
 * Como vista, la web es una página normal en su propio sitio y deja de haber
 * dos sesiones distintas.
 */
function montarVistaWeb(url) {
  if (vistaWeb) return;

  vistaWeb = new WebContentsView({
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  ventana.contentView.addChildView(vistaWeb);
  vistaWeb.webContents.loadURL(url);
  ajustarVistaWeb();

  // Los enlaces externos, al navegador de verdad. Mismo criterio que la
  // ventana: nada de ventanas sin barra de direcciones.
  vistaWeb.webContents.setWindowOpenHandler(({ url: destino }) => {
    if (!destino.startsWith(url.split("/").slice(0, 3).join("/"))) shell.openExternal(destino);
    return { action: "deny" };
  });

  ventana.on("resize", ajustarVistaWeb);
}

function ajustarVistaWeb() {
  if (!vistaWeb || !ventana || ventana.isDestroyed()) return;
  const [ancho, alto] = ventana.getContentSize();
  vistaWeb.setBounds({ x: 0, y: ALTO_BARRA, width: ancho, height: Math.max(0, alto - ALTO_BARRA) });
}

const ANCHO_AVISO = 380;
const ALTO_AVISO = 104;

/**
 * Aviso propio: ventana sin marco, siempre encima y transparente.
 *
 * Los globos de Windows no se pueden maquillar —son los del sistema y punto—,
 * y encima de la partida no valen. Esto además es la base del aviso en juego:
 * con League en ventana sin bordes, se ve por encima.
 */
function mostrarAviso(titulo, cuerpo, urgente, destino = null) {
  const { screen } = require("electron");
  const pantalla = screen.getPrimaryDisplay().workArea;

  // El aviso sin nada que hacer no se puede pulsar: en partida, una ventana
  // que traga clics encima del juego es peor que no tener aviso. Solo se
  // vuelve pulsable cuando lleva un destino al que ir.
  destinoAviso = destino;
  const pulsable = !!destino;

  // `focusable` solo se puede fijar al crear la ventana, y una ventana no
  // enfocable no recibe clics en Windows. Así que cuando cambia el modo se
  // rehace: son dos ventanas distintas disfrazadas de una.
  if (aviso && !aviso.isDestroyed() && aviso.__pulsable !== pulsable) {
    aviso.destroy();
    aviso = null;
  }

  if (!aviso || aviso.isDestroyed()) {
    aviso = new BrowserWindow({
      width: ANCHO_AVISO,
      height: ALTO_AVISO,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      skipTaskbar: true,        // no aparece en la barra de tareas
      // Robar el foco en partida es fatal; pero sin foco no hay clic, así que
      // el que lleva a algún sitio sí lo acepta. Aun así se muestra con
      // showInactive, que lo enseña sin activarlo hasta que lo pulsan.
      focusable: pulsable,
      alwaysOnTop: true,
      show: false,
    });
    aviso.__pulsable = pulsable;
    // Por encima incluso de ventanas a pantalla completa sin bordes.
    aviso.setAlwaysOnTop(true, "screen-saver");
  }
  aviso.setIgnoreMouseEvents(!pulsable);

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
    accion: destino ? "1" : "0",
  });
  aviso.loadFile(path.join(__dirname, "src", "aviso.html"), { search: params.toString() });
  aviso.showInactive();  // se muestra sin quitar el foco al juego

  // La propia página avisa por el hash: cuando termina de irse, y cuando la
  // pulsan. Un hash y no IPC porque no hay puente entre procesos montado para
  // esta ventana, y montarlo para dos mensajes sería más pieza que problema.
  // Un error dentro del aviso lo deja mudo y clavado en pantalla, y sin esto no
  // se ve por ningún lado: la ventana no tiene consola abierta.
  aviso.webContents.removeAllListeners("console-message");
  aviso.webContents.on("console-message", (_e, nivel, mensaje) => {
    if (nivel >= 2) console.log(`  [aviso] error en la tarjeta: ${mensaje}`);
  });

  aviso.webContents.removeAllListeners("did-navigate-in-page");
  aviso.webContents.on("did-navigate-in-page", (_e, url) => {
    if (!aviso || aviso.isDestroyed()) return;
    if (url.endsWith("#fin")) aviso.hide();
    if (url.endsWith("#abrir")) {
      console.log(`  [aviso] pulsado -> ${destinoAviso}`);
      aviso.hide();
      abrirEn(destinoAviso);
    }
  });
}

/**
 * Trae la aplicación al frente y la lleva a donde diga el aviso.
 *
 * Se llama a una función que expone la interfaz en vez de recargarla con otra
 * URL: recargar perdería lo que el usuario estuviera haciendo, y el destino es
 * la web incrustada, no la ventana.
 */
function abrirEn(destino) {
  if (!ventana || ventana.isDestroyed() || !destino) return;
  if (ventana.isMinimized()) ventana.restore();
  ventana.show();
  ventana.focus();
  // La barra vuelve a la pestaña de torneo; la vista, al destino.
  ventana.webContents.executeJavaScript("window.__aTorneo && window.__aTorneo()").catch(() => {});
  if (vistaWeb) {
    vistaWeb.setVisible(true);
    vistaWeb.webContents.loadURL(destino);
  }
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
    // El de la ventana y la barra de tareas. Va aparte del que empaqueta
    // electron-builder para el ejecutable y el instalador.
    icon: path.join(__dirname, "build", "icon.png"),
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

  // F5 y Ctrl+R. Hay que registrarlos a mano: al quitar el menú de la
  // aplicación —para que no salga la barra de arriba— se van con él los atajos
  // que trae de serie, recargar incluido.
  ventana.webContents.on("before-input-event", (evento, entrada) => {
    if (entrada.type !== "keyDown") return;
    const recargar = entrada.key === "F5" || (entrada.control && entrada.key.toLowerCase() === "r");
    if (!recargar) return;
    evento.preventDefault();
    // `reloadIgnoringCache` y no `reload`: si no, el navegador puede seguir
    // sirviendo la versión anterior de la interfaz y parece que no ha pasado nada.
    ventana.webContents.reloadIgnoringCache();
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

    // La interfaz no puede hablar con Electron por su cuenta —no hay puente
    // entre procesos montado—, así que pasa por el servidor local, que sí. Es
    // el mismo camino que ya usan los avisos, en vez de un canal nuevo.
    // Diagnóstico: pulsa el aviso desde dentro. Sirve para separar dos fallos
    // que se ven igual — que el clic no llegue a la ventana, o que llegue y no
    // haga nada.
    globalThis.__srankClicAviso = () => {
      if (!aviso || aviso.isDestroyed()) return { error: "no hay aviso" };
      const punto = { x: Math.round(ANCHO_AVISO / 2), y: Math.round(ALTO_AVISO / 2) };
      aviso.webContents.sendInputEvent({ type: "mouseDown", button: "left", clickCount: 1, ...punto });
      aviso.webContents.sendInputEvent({ type: "mouseUp", button: "left", clickCount: 1, ...punto });
      return {
        enfocable: aviso.isFocusable(),
        visible: aviso.isVisible(),
        pulsable: aviso.__pulsable,
        destino: destinoAviso,
      };
    };

    globalThis.__srankVista = {
      montar: (url) => montarVistaWeb(url),
      ver: (visible) => vistaWeb?.setVisible(visible),
    };

    const { default: servidor } = await import("./server.mjs");
    await new Promise((listo) =>
      servidor.listening ? listo() : servidor.once("listening", listo)
    );

    Menu.setApplicationMenu(null);
    crearVentana();
  });

  app.on("window-all-closed", () => app.quit());
}
