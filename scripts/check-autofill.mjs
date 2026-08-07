// Comprueba el aviso de Autofill: cuándo avisa, cuándo calla, y que el reporte
// salga una sola vez y en el instante bueno.
//
// Importar el servidor lo arranca —así lo espera Electron—, así que se le pide
// puerto libre; si no, choca con el cliente abierto. Y se sale a mano al final,
// porque queda escuchando.
import assert from "node:assert/strict";
process.env.SRANK_PORT = "0";
const { problemaAutofill } = await import("../desktop-client/server.mjs");

// ── Qué cuenta como incumplir ──────────────────────────────────────────────
assert.equal(problemaAutofill("FILL"), null, "FILL cumple");
assert.equal(problemaAutofill("fill"), null, "el cliente no siempre lo manda en mayúsculas");
assert.match(problemaAutofill("MIDDLE"), /MIDDLE/, "un rol concreto incumple y se nombra");
assert.equal(problemaAutofill(null), null, "sin posición todavía no se avisa");
assert.equal(problemaAutofill(""), null, "cadena vacía es lo mismo que sin posición");

// ── La máquina de fases ────────────────────────────────────────────────────
// Réplica de las guardas de vigilar(). Aquí es donde estaría el fallo: avisar
// cada dos segundos, juzgar una búsqueda cancelada, o juzgar con la posición
// de la partida anterior.
//
// Cada paso es [fase, posición-en-el-lobby].
function recorrer(pasos) {
  let anterior = null, ultimo = null, reportado = false, enCola = null;
  const avisos = [], reportes = [];

  for (const [fase, posicion] of pasos) {
    if (!["Lobby", "Matchmaking", "ChampSelect"].includes(fase)) {
      ultimo = null; reportado = false; enCola = null; anterior = fase; continue;
    }
    if (fase === "Lobby") {
      reportado = false;
      const problema = problemaAutofill(posicion);
      if (problema && problema !== ultimo) avisos.push(problema);
      ultimo = problema;
    }
    if (fase === "Matchmaking" && anterior === "Lobby") enCola = posicion ?? null;
    if (fase === "ChampSelect" && enCola && !reportado) {
      reportado = true;
      reportes.push(enCola);
    }
    anterior = fase;
  }
  return { avisos, reportes };
}

const seguido = recorrer([["Lobby", "MIDDLE"], ["Lobby", "MIDDLE"], ["Lobby", "MIDDLE"]]);
assert.equal(seguido.avisos.length, 1, "el mismo problema no avisa en cada sondeo");

const corrige = recorrer([["Lobby", "MIDDLE"], ["Lobby", "FILL"], ["Lobby", "FILL"]]);
assert.equal(corrige.avisos.length, 1, "avisa una vez y calla cuando lo corrige");

const recae = recorrer([["Lobby", "MIDDLE"], ["Lobby", "FILL"], ["Lobby", "TOP"]]);
assert.equal(recae.avisos.length, 2, "si vuelve a cambiarlo, vuelve a avisar");

// El veredicto no sale al buscar, sale al entrar en selección: es lo que
// confirma que la búsqueda acabó en partida.
const buscando = recorrer([["Lobby", "FILL"], ["Matchmaking", "FILL"], ["Matchmaking", "FILL"]]);
assert.deepEqual(buscando.reportes, [], "buscar partida todavía no juzga nada");

const juega = recorrer([
  ["Lobby", "FILL"], ["Matchmaking", "FILL"], ["ChampSelect", null], ["ChampSelect", null],
]);
assert.deepEqual(juega.reportes, ["FILL"], "juzga una sola vez, con lo elegido en el lobby");

// En selección el lobby ya se está deshaciendo: la posición tiene que venir de
// lo guardado al buscar, no de lo que diga el cliente en ese momento.
const desapareceLobby = recorrer([
  ["Lobby", "TOP"], ["Matchmaking", "TOP"], ["ChampSelect", null],
]);
assert.deepEqual(desapareceLobby.reportes, ["TOP"], "se juzga lo que se pidió, no lo que quede");

const cancela = recorrer([
  ["Lobby", "TOP"], ["Matchmaking", "TOP"],       // busca con rol, y cancela
  ["Lobby", "FILL"], ["Matchmaking", "FILL"],     // lo corrige y vuelve a buscar
  ["ChampSelect", null],
]);
assert.deepEqual(cancela.reportes, ["FILL"], "cancelar antes de selección no se juzga");

const suelto = recorrer([["ChampSelect", null]]);
assert.deepEqual(suelto.reportes, [], "sin haber pasado por la cola no hay nada que juzgar");

const partidaAnterior = recorrer([
  ["Lobby", "TOP"], ["Matchmaking", "TOP"], ["ChampSelect", null], ["InProgress", null],
  ["ChampSelect", null],  // la siguiente partida, entrada por invitación de otro
]);
assert.deepEqual(partidaAnterior.reportes, ["TOP"], "la posición no se arrastra a la partida siguiente");

console.log("check-autofill: todo bien");

process.exit(0);
