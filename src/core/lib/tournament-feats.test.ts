// Self-check de los retos de torneo: `node src/core/lib/tournament-feats.test.ts`
import assert from "node:assert/strict";
import { FEATS, featsForRole, evaluateFeats, featPoints } from "./tournament-feats.ts";

const ROLES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

// La promesa del diseño: todos los roles compiten con el mismo número de retos
// y el mismo fondo común de puntos.
for (const role of ROLES) {
  const feats = featsForRole(role);
  assert.equal(feats.length, 20, `${role} deberia tener 20 retos, tiene ${feats.length}`);
  const propios = feats.filter((f) => f.scope === role);
  assert.equal(propios.length, 2, `${role} deberia tener 2 de firma`);
  assert.equal(propios.reduce((s, f) => s + f.points, 0), 10, `la firma de ${role} deberia valer 10`);
}

// El fondo común es idéntico para todos.
const comun = FEATS.filter((f) => f.scope === "equipo" || f.scope === "individual");
assert.equal(comun.length, 18);
assert.equal(comun.reduce((s, f) => s + f.points, 0), 564);

// Sin claves repetidas: dos retos sobre la misma métrica pagarían dos veces.
const keys = FEATS.map((f) => f.key);
assert.equal(new Set(keys).size, keys.length, "hay metricas duplicadas");

// Contadores: pagan por cada repetición.
const jungla = evaluateFeats("JUNGLE", { riftHeraldTakedowns: 3 });
assert.equal(jungla[0].count, 3);
assert.equal(jungla[0].points, 15);

// Umbral: paga una vez aunque el valor sea alto o fraccionario. Este es el fallo
// que dio puntos como "9,43" antes de distinguirlos.
const umbral = evaluateFeats("MIDDLE", { visionScoreAdvantageLaneOpponent: 14.7 });
assert.equal(umbral[0].count, 1);
assert.equal(umbral[0].points, 3);

// Valores negativos o cero no cuentan: la ventaja de visión es una diferencia y
// la mitad de los jugadores la tiene en contra.
assert.equal(evaluateFeats("MIDDLE", { visionScoreAdvantageLaneOpponent: -8 }).length, 0);
assert.equal(evaluateFeats("MIDDLE", { survivedSingleDigitHpCount: 0 }).length, 0);

// Un contador fraccionario se trunca en vez de dar puntos rotos.
assert.equal(evaluateFeats("TOP", { teleportTakedowns: 2.9 })[0].count, 2);

// La firma ajena no cuenta aunque la métrica venga en los datos.
assert.equal(evaluateFeats("UTILITY", { teleportTakedowns: 5 }).length, 0);
assert.equal(evaluateFeats("TOP", { teleportTakedowns: 5 })[0].points, 25);

// Booleanos de la API.
assert.equal(evaluateFeats("TOP", { firstBloodKill: true })[0].points, 20);
assert.equal(evaluateFeats("TOP", { firstBloodKill: false }).length, 0);

// Suma total.
const varios = evaluateFeats("JUNGLE", {
  firstBloodKill: true,          // 20
  riftHeraldTakedowns: 2,        // 10
  teamBaronKills: 1,             //  3
  quickSoloKills: 1,             //  5
});
assert.equal(featPoints(varios), 38);

// Rol desconocido: se queda con el fondo común, no revienta.
assert.equal(featsForRole("").length, 18);

console.log("tournament-feats: OK");
