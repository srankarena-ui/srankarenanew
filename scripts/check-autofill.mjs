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
// Réplica de las guardas de vigilar(): avisar solo al cambiar el problema, y
// reportar solo en el salto Lobby → Matchmaking. Es donde estaría el fallo:
// avisar cada dos segundos, o reportar dos veces y resolver el castigo tarde.
function recorrer(pasos) {
  let anterior = null, ultimo = null, reportado = false;
  const avisos = [], reportes = [];

  for (const [fase, posicion] of pasos) {
    if (fase !== "Lobby" && fase !== "Matchmaking") {
      ultimo = null; reportado = false; anterior = fase; continue;
    }
    if (fase === "Lobby") {
      reportado = false;
      const problema = problemaAutofill(posicion);
      if (problema && problema !== ultimo) avisos.push(problema);
      ultimo = problema;
    }
    if (fase === "Matchmaking" && anterior === "Lobby" && !reportado) {
      reportado = true;
      if (posicion) reportes.push(posicion);
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

const cola = recorrer([["Lobby", "FILL"], ["Matchmaking", "FILL"], ["Matchmaking", "FILL"]]);
assert.deepEqual(cola.reportes, ["FILL"], "se reporta una sola vez al entrar en cola");

const cancela = recorrer([
  ["Lobby", "FILL"], ["Matchmaking", "FILL"],   // busca
  ["Lobby", "TOP"],  ["Matchmaking", "TOP"],    // cancela, cambia y vuelve a buscar
]);
assert.deepEqual(cancela.reportes, ["FILL", "TOP"], "cancelar y rebuscar cuenta de nuevo");

const suelto = recorrer([["Matchmaking", "TOP"]]);
assert.deepEqual(suelto.reportes, [], "sin haber pasado por el lobby no se reporta");

console.log("check-autofill: todo bien");

process.exit(0);
