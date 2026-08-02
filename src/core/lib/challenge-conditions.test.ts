// Self-check de la lógica de retos. Sin framework: `node src/core/lib/challenge-conditions.test.ts`
import assert from "node:assert/strict";
import {
  evaluateCondition,
  masteryChampion,
  parseCondition,
  type ChallengeCondition,
} from "./challenge-conditions.ts";

const mastery: ChallengeCondition = { type: "champion_mastery", champion: "Jhin", min_points: 50000 };

// Maestría: hace falta el campeón correcto Y los puntos suficientes.
assert.equal(evaluateCondition(mastery, { champion: "Jhin", masteryPoints: 60000 }), true);
assert.equal(evaluateCondition(mastery, { champion: "Jhin", masteryPoints: 10 }), false);
assert.equal(evaluateCondition(mastery, { champion: "Ahri", masteryPoints: 60000 }), false);
// Sin maestría resuelta todavía no se da por cumplido (min_points 0 incluido).
assert.equal(evaluateCondition(mastery, { champion: "Jhin" }), false);
assert.equal(
  evaluateCondition({ type: "champion_mastery", champion: "Jhin", min_points: 0 }, { champion: "Jhin" }),
  false
);

assert.equal(evaluateCondition({ type: "role_played", role: "JUNGLE" }, { role: "JUNGLE" }), true);
assert.equal(evaluateCondition({ type: "role_played", role: "JUNGLE" }, { role: "TOP" }), false);
assert.equal(evaluateCondition({ type: "queue_played", queue_id: 420 }, { queueId: 420 }), true);
assert.equal(evaluateCondition({ type: "queue_played", queue_id: 420 }, {}), false);

// Composición
const combo: ChallengeCondition = {
  type: "and",
  conditions: [mastery, { type: "role_played", role: "JUNGLE" }],
};
assert.equal(evaluateCondition(combo, { champion: "Jhin", masteryPoints: 60000, role: "JUNGLE" }), true);
assert.equal(evaluateCondition(combo, { champion: "Jhin", masteryPoints: 60000, role: "TOP" }), false);

assert.equal(masteryChampion(combo), "Jhin");
assert.equal(masteryChampion({ type: "role_played", role: "TOP" }), null);

// Validación de lo que guarda el admin
assert.deepEqual(parseCondition({ type: "role_played", role: "JUNGLE" }), { type: "role_played", role: "JUNGLE" });
assert.equal(parseCondition({ type: "role_played", role: "MID" }), null);
assert.equal(parseCondition({ type: "champion_mastery", champion: 84, min_points: 1 }), null);
assert.equal(parseCondition({ type: "champion_mastery", champion: "Jhin" }), null);
assert.equal(parseCondition({ type: "champion_mastery", champion: "  ", min_points: 1 }), null);
assert.deepEqual(
  parseCondition({ type: "champion_mastery", champion: "Jhin", min_points: 0 }),
  { type: "champion_mastery", champion: "Jhin", min_points: 0 }
);
assert.equal(parseCondition({ type: "unknown_thing" }), null);
assert.equal(parseCondition({ type: "and", conditions: [] }), null);
assert.equal(parseCondition({ type: "and", conditions: [{ type: "nope" }] }), null);
assert.equal(parseCondition(null), null);
assert.equal(parseCondition([{ type: "role_played", role: "TOP" }]), null);
// Anidamiento por encima del tope se rechaza en vez de recursar sin control.
const deep = { type: "and", conditions: [{ type: "and", conditions: [{ type: "and", conditions: [{ type: "and", conditions: [{ type: "role_played", role: "TOP" }] }] }] }] };
assert.equal(parseCondition(deep), null);

console.log("challenge-conditions: OK");
