// La ruleta reparte castigos a personas reales: si sortea mal, alguien se come
// una partida rota. Se comprueba que no salga nunca uno que no aplica a su rol
// y que los pesos hagan lo que dicen.
//   node --experimental-strip-types scripts/check-castigos.mjs
import assert from "node:assert";
import { CASTIGOS, castigosParaRol, rollCastigo } from "../src/core/lib/castigos.ts";

const ROLES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

// ── Nadie recibe un castigo que no le aplica ────────────────────────────────
for (const role of ROLES) {
  const permitidos = new Set(castigosParaRol(role).map((c) => c.key));
  assert(permitidos.size >= 5, `${role} solo tiene ${permitidos.size} castigos posibles`);

  // 3.000 tiradas: si un castigo prohibido puede salir, sale.
  for (let i = 0; i < 3000; i++) {
    const c = rollCastigo(role, Math.random);
    assert(permitidos.has(c.key), `${role} recibió "${c.key}", que no le aplica`);
  }
}

// El support no puede recibir "sin guardianes de control": es su trabajo.
assert(
  !castigosParaRol("UTILITY").some((c) => c.key === "sin_guardianes_control"),
  "el support no debería poder recibir 'sin guardianes de control'"
);
assert(castigosParaRol("TOP").some((c) => c.key === "sin_guardianes_control"));

// Sin rol conocido solo salen los que valen para cualquiera: no arriesgar.
const sinRol = castigosParaRol(null);
assert(sinRol.every((c) => !c.roles), "sin rol conocido no deben salir los restringidos");
assert(sinRol.length > 0);

// ── Los pesos: lo duro sale menos, pero sale ────────────────────────────────
const TIRADAS = 60000;
const veces = {};
for (let i = 0; i < TIRADAS; i++) {
  const c = rollCastigo("MIDDLE");
  veces[c.key] = (veces[c.key] ?? 0) + 1;
}

const pool = castigosParaRol("MIDDLE");
console.log(`${TIRADAS} tiradas para un mid:\n`);
for (const c of [...pool].sort((a, b) => (veces[b.key] ?? 0) - (veces[a.key] ?? 0))) {
  const pct = ((100 * (veces[c.key] ?? 0)) / TIRADAS).toFixed(2);
  console.log(`  ${c.name.padEnd(26)} dureza ${c.dureza}   ${pct.padStart(5)}%`);
}

// Todos tienen que poder salir: un castigo que nunca toca es código muerto.
for (const c of pool) {
  assert((veces[c.key] ?? 0) > 0, `"${c.key}" no salió ni una vez en ${TIRADAS} tiradas`);
}

// Y los duros tienen que salir menos que los suaves, que es para lo que existe
// el peso. Se compara el grupo entero, no castigos sueltos, porque el azar
// mueve los individuales.
const media = (d) => {
  const g = pool.filter((c) => c.dureza === d);
  return g.reduce((a, c) => a + (veces[c.key] ?? 0), 0) / g.length;
};
assert(media(1) > media(2), "los suaves deberían salir más que los medios");
assert(media(2) > media(3), "los medios deberían salir más que los duros");

// ── Claves únicas: dos castigos con la misma clave romperían el registro ────
assert.equal(new Set(CASTIGOS.map((c) => c.key)).size, CASTIGOS.length, "hay claves repetidas");

console.log("\nOK: la ruleta respeta los roles, todos pueden salir y los duros salen menos.");
