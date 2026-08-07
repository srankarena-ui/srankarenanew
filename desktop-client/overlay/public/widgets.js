// Registro de elementos del overlay — lo comparten panel.html y overlay.html.
//
// WIDGETS: bloques colocables. Se mueven y se escalan arrastrando en la vista previa.
//          En el HTML del overlay llevan data-widget="<id>" y un <div class="resize-handle">.
// PARTS:   piezas dentro de un widget. Solo se muestran u ocultan (heredan la posición del widget).
//          En el HTML llevan data-part="<id>" — puede repetirse en varios elementos (por ejemplo
//          una columna y su separador vertical), todos se ocultan juntos.
//
// Agregar un elemento nuevo = una línea aquí + el data-attribute en overlay.html. El servidor no
// conoce esta lista: guarda cualquier clave que le llegue, y lo que falta vale "visible".
window.OVERLAY_WIDGETS = [
  { id: "dead",  name: "Tarjeta grande",  hint: "Aparece al morir" },
  { id: "alive", name: "Tarjeta mini",    hint: "Aparece mientras estás vivo" },
  { id: "cmdRunes", name: "Panel de runas",        hint: "Lo pide el chat con !runas" },
  { id: "cmdComp",  name: "Panel de composición",  hint: "Lo pide el chat con !comp" },
  { id: "cmdBuild", name: "Panel de build",        hint: "Lo pide el chat con !build" },
  { id: "cmdRank",  name: "Panel de rango",        hint: "Lo pide el chat con !rank o !hoy" },
  { id: "cmdMatchup", name: "Duelo de carril", hint: "Sale solo al empezar la partida" },
  { id: "ladder", name: "Clasificación del torneo", hint: "En vivo desde S-Rank Arena" },
  { id: "reto",   name: "Reto activo",              hint: "El castigo que llevas encima" },
  { id: "ruleta", name: "Ruleta de castigos",       hint: "Sale sola al recibir uno" },
];

// Comandos de chat -> widget que muestran. La clave es lo que se escribe después del "!".
// Varios comandos pueden apuntar al mismo widget (son sinónimos y comparten la espera).
// Agregar un comando = una línea aquí, su widget arriba y el HTML con data-widget en overlay.html.
window.OVERLAY_COMMANDS = {
  runas: "cmdRunes",
  comp: "cmdComp", composicion: "cmdComp",
  build: "cmdBuild", items: "cmdBuild",
  rank: "cmdRank", rango: "cmdRank", hoy: "cmdRank",
};

window.OVERLAY_PARTS = [
  { w: "ladder", id: "ladderTitulo", name: "Título del torneo" },
  { w: "dead",  id: "gameHeader", name: "Encabezado + reloj" },
  { w: "dead",  id: "crest",      name: "Ícono + marco" },
  { w: "dead",  id: "name",       name: "Nombre" },
  { w: "dead",  id: "title",      name: "Título de challenges" },
  { w: "dead",  id: "rankLine",   name: "Línea de rango" },
  { w: "dead",  id: "badges",     name: "Insignias (sangre / multi / ace)" },
  { w: "dead",  id: "respawn",    name: "Contador de reaparición" },
  { w: "dead",  id: "stats",      name: "Columna de estadísticas (todas)" },
  { w: "dead",  id: "kda",        name: "KDA" },
  { w: "dead",  id: "farm",       name: "Farm / CS" },
  { w: "dead",  id: "streak",     name: "Racha de asesinatos" },
  { w: "dead",  id: "dragons",    name: "Dragones" },
  { w: "dead",  id: "objectives", name: "Objetivos (torres / heraldo / barón)" },
  { w: "dead",  id: "items",      name: "Ítems comprados" },

  { w: "alive", id: "miniCrest",   name: "Ícono + marco" },
  { w: "alive", id: "miniRank",    name: "Rango y LP" },
  { w: "alive", id: "miniSession", name: "Sesión W / L" },
  { w: "alive", id: "matches",     name: "Últimas partidas" },

  { w: "cmdRunes", id: "runeNames",  name: "Nombre debajo de cada runa" },
  { w: "cmdComp",  id: "compNames",  name: "Nombre del campeón" },
  { w: "cmdComp",  id: "compTrees",  name: "Árboles de runas (además del keystone)" },
  { w: "cmdBuild", id: "buildTimes", name: "Minuto de cada ítem" },
  { w: "cmdRank",  id: "rankToday",  name: "Balance de hoy (W/L)" },
  { w: "cmdRank",  id: "rankTitle",  name: "Título de challenges" },
  { w: "cmdMatchup", id: "vsNames",  name: "Nombres de los campeones" },
  { w: "cmdMatchup", id: "vsBolt",   name: "Texto \"VS\" en el centro" },
  { w: "cmdMatchup", id: "muGrade",  name: "Nota de letra (S+/A/B…)" },
  { w: "cmdMatchup", id: "muGames",  name: "Nº de partidas de la muestra" },
];
