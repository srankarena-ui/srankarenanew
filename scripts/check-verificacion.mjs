// La verificación decide si alguien pierde 100 puntos en directo. Se comprueba
// que cada castigo distingue cumplir de no cumplir, y que ninguno se queda sin
// forma de comprobarse.
//   node --experimental-strip-types scripts/check-verificacion.mjs
import assert from "node:assert";
import {
  CASTIGOS, CASTIGOS_VERIFICABLES, castigosParaRol, verificarCastigo, rollCastigo,
} from "../src/core/lib/castigos.ts";

// Partida "limpia": no lleva Destello ni Prender, no compró nada, no pingueó.
// Cumple todos los castigos a la vez, que es el punto de partida útil.
const LIMPIA = {
  campeon: "Yorick",
  hechizos: [6, 12],          // Fantasma + Teleporte
  usosHechizos: [8, 8],
  usosUlti: 2,
  visionWardsBought: 0,
  consumablesPurchased: 0,
  pings: 0,
  comproBotas: false,
  objetoMasCaro: 1300,
  piedraAngular: 8010,   // Conquistador: no es Pies veloces
};

const con = (patch) => ({ ...LIMPIA, ...patch });

// ── Cada castigo: se cumple en la limpia, se incumple con su infracción ──────
const PARAMS = {
  campeon_aleatorio: { campeon: "Yorick" },
  campeon_bajo: { vetados: ["Darius", "Jhin"] },
  sin_tus_tres: { vetados: ["Darius", "Jhin", "Lux"] },
};

const INFRACCIONES = {
  campeon_aleatorio: { campeon: "Teemo" },
  campeon_bajo: { campeon: "Darius" },
  sin_tus_tres: { campeon: "Lux" },
  sin_flash: { hechizos: [4, 12] },
  sin_prender: { hechizos: [14, 12] },
  sin_botas: { comproBotas: true },
  sin_guardianes_control: { visionWardsBought: 1 },
  sin_consumibles: { consumablesPurchased: 1 },
  presupuesto: { objetoMasCaro: 3001 },
  ulti_tres_veces: { usosUlti: 6 },
  sin_pings: { pings: 1 },
  secundario_seis: { usosHechizos: [8, 3] },
};

for (const c of CASTIGOS_VERIFICABLES) {
  const infraccion = INFRACCIONES[c.key];
  assert(infraccion, `"${c.key}" entra en la ruleta pero el check no lo cubre`);

  const par = PARAMS[c.key] ?? {};
  assert.equal(verificarCastigo(c.key, LIMPIA, par), true, `"${c.key}" no da por cumplida la partida limpia`);
  assert.equal(verificarCastigo(c.key, con(infraccion), par), false, `"${c.key}" no detecta su infracción`);
}

// Lo que se comprueba son los objetos FINALES, no las compras: el texto de
// esos dos castigos lo dice, y el check lo fija para que no se separen.
assert.equal(verificarCastigo("sin_botas", con({ comproBotas: false })), true, "terminar sin botas cumple");

// Los umbrales, justo en el borde: un "3000 de oro como máximo" que rechace
// 3000 exactos es un castigo distinto del anunciado.
assert.equal(verificarCastigo("presupuesto", con({ objetoMasCaro: 3000 })), true, "3000 exactos entran en el presupuesto");
assert.equal(verificarCastigo("ulti_tres_veces", con({ usosUlti: 5 })), true, "cinco usos exactos cumplen");
assert.equal(verificarCastigo("secundario_seis", con({ usosHechizos: [4, 4] })), true, "cuatro exactos cumplen");

// Pies veloces cuenta igual que llevar botas: el castigo son las dos cosas.
assert.equal(verificarCastigo("sin_botas", con({ piedraAngular: 8021 })), false, "Pies veloces incumple aunque no lleve botas");

// El hechizo puede ir en cualquiera de las dos ranuras: el orden lo elige el
// jugador, así que mirar solo la primera dejaría pasar a media plataforma.
assert.equal(verificarCastigo("sin_flash", con({ hechizos: [12, 4] })), false, "Destello en la segunda ranura también incumple");
assert.equal(verificarCastigo("sin_prender", con({ hechizos: [12, 14] })), false, "Prender en la segunda ranura también incumple");

// ── Nada sin comprobar puede llegar a un jugador ─────────────────────────────
// Sin params congelados no puede darse por cumplido: si no sabemos qué campeón
// le tocó, dar el castigo por bueno sería regalar el cumplimiento.
assert.equal(verificarCastigo("campeon_aleatorio", LIMPIA, {}), false, "sin campeón congelado no se da por cumplido");
assert.equal(verificarCastigo("inventado", LIMPIA), null, "una clave desconocida devuelve null");

for (const role of ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY", null]) {
  for (const c of castigosParaRol(role)) {
    assert(c.verify, `"${c.key}" se le puede imponer a ${role} sin saber comprobarlo`);
  }
  for (let i = 0; i < 2000; i++) {
    assert(rollCastigo(role).verify, `la ruleta saco un castigo sin verificación para ${role}`);
  }
}

const fuera = CASTIGOS.filter((c) => !c.verify);
console.log(`${CASTIGOS_VERIFICABLES.length} de ${CASTIGOS.length} castigos se comprueban solos`);
console.log(`fuera de la ruleta hasta poder comprobarlos: ${fuera.map((c) => c.name).join(", ")}`);
console.log("\nOK: cada castigo detecta su infracción, los umbrales caen donde se anuncia,");
console.log("    y la ruleta nunca reparte algo que no sepamos verificar.");
