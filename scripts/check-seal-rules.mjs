// Comprueba las reglas de sellos contra las 10.020 actuaciones reales y contra
// los casos límite que se me escaparon al diseñarlas.
//   node scripts/check-seal-rules.mjs
import assert from "node:assert";
import fs from "node:fs";
import { sealsForMatch, sealsForStreaks, SEAL_RULES, SEAL_CAP } from "../src/core/lib/seal-rules.ts";

// ── Rachas: lo único con estado, y donde es fácil equivocarse ────────────────
const w = (n) => Array.from({ length: n }, (_, i) => ({ win: true, matchId: `w${i}` }));
const l = (n) => Array.from({ length: n }, (_, i) => ({ win: false, matchId: `l${i}` }));

assert.deepEqual(sealsForStreaks(w(4)), [], "4 victorias no son racha");
assert.deepEqual(sealsForStreaks(w(5)), [{ reason: "racha_victorias", matchId: "w4" }]);
assert.equal(sealsForStreaks(w(7)).length, 3, "7 seguidas son 3 ventanas de 5");
assert.deepEqual(sealsForStreaks(l(5)), [{ reason: "racha_derrotas", matchId: "l4" }]);

// Una derrota parte la racha: 4+1+4 no paga nada.
assert.deepEqual(sealsForStreaks([...w(4), ...l(1), ...w(4)]), [], "la derrota corta la racha");

// Y la racha se reinicia de verdad, no se acumula por bandos.
assert.equal(sealsForStreaks([...w(3), ...l(5)]).length, 1);

// ── Reglas de una partida ───────────────────────────────────────────────────
const base = {
  win: true, deaths: 0, kills: 5, assists: 5, killParticipation: 80,
  pentaKills: 0, teamDamagePercentage: 0.2, quadraKills: 0, gameDuration: 1800,
  featKeys: [],
};
const has = (patch, key) => sealsForMatch({ ...base, ...patch }).includes(key);

assert(has({}, "kda_perfecto"), "sin morir con KP alta y 10 participaciones");
assert(has({ deaths: 1 }, "kda_perfecto"), "una muerte cuenta igual que ninguna");
assert(!has({ deaths: 2 }, "kda_perfecto"), "dos muertes ya no");
assert(!has({ killParticipation: 40 }, "kda_perfecto"), "KP por debajo del 50%");
// El caso que motivó el suelo: 2/1/1 en una partida de cuatro asesinatos.
assert(
  !has({ deaths: 1, kills: 2, assists: 1, killParticipation: 75 }, "kda_perfecto"),
  "partida sin acción no da sello aunque el KDA salga limpio"
);

assert(has({ teamDamagePercentage: 0.4 }, "carga_de_dano"));
assert(!has({ win: false, teamDamagePercentage: 0.25 }, "carga_derrotada"));
assert(has({ win: false, teamDamagePercentage: 0.35 }, "carga_derrotada"));
// Ganar con mucho daño no es "cargaste y perdiste".
assert(!has({ win: true, teamDamagePercentage: 0.5 }, "carga_derrotada"));
// "Desde las cenizas" exige ganar: aguantar y perder no cuenta.
assert(!has({ win: false, featKeys: ["hadOpenNexus"] }, "desde_las_cenizas"));
assert(has({ win: true, featKeys: ["hadOpenNexus"] }, "desde_las_cenizas"));

// Reglas nuevas
assert(has({ kills: 22 }, "masacre"));
assert(!has({ kills: 21 }, "masacre"));
assert(has({ assists: 30 }, "orquesta"));
assert(has({ quadraKills: 1 }, "cuadrakill"));
assert(has({ win: true, gameDuration: 2400 }, "maraton"));
assert(!has({ win: false, gameDuration: 3000 }, "maraton"), "perder una larga no es maratón");
// KDA de 20 con la convención de Riot: sin muertes se divide entre 1.
assert(has({ kills: 10, assists: 11, deaths: 0 }, "kda_20"));
assert(!has({ kills: 10, assists: 10, deaths: 0 }, "kda_20"), "exactamente 20 no supera 20");

// ── Frecuencia real: ninguna regla puede inundar la economía ────────────────
// Se usa el dataset unido, que sí separa kills de asistencias.
const { loadPerformances } = await import("./dataset.mjs");
const rows = loadPerformances();
const counts = {};
let totalSellos = 0;
for (const r of rows) {
  const c = r.c ?? {};
  const earned = sealsForMatch({
    win: r.win,
    deaths: r.deaths,
    kills: r.kills,
    assists: r.assists,
    killParticipation: (c.killParticipation ?? 0) * 100,
    pentaKills: c.pentaKills ?? 0,
    teamDamagePercentage: c.teamDamagePercentage ?? 0,
    quadraKills: c.quadraKills ?? 0,
    gameDuration: r.duration_min * 60,
    featKeys: Object.keys(c),
  });
  totalSellos += earned.length;
  for (const k of earned) counts[k] = (counts[k] ?? 0) + 1;
}

console.log(`sobre ${rows.length} actuaciones reales:\n`);
for (const rule of SEAL_RULES) {
  const pct = ((100 * (counts[rule.key] ?? 0)) / rows.length).toFixed(2);
  const medida = counts[rule.key] != null ? `${pct}%` : "—";
  console.log(`  ${rule.key.padEnd(18)} medido ${medida.padStart(6)}   declarado ${rule.rate ?? "—"}`);
}

// Una regla que salta en más de 1 de cada 10 partidas convierte los sellos en
// confeti. Es el error que casi cometo con "3+ asesinatos en solitario" (24%).
for (const [key, n] of Object.entries(counts)) {
  const pct = (100 * n) / rows.length;
  assert(pct < 10, `la regla ${key} salta en el ${pct.toFixed(1)}% de las partidas: inunda la economía`);
}

// El tope de inventario solo significa algo si la producción se le acerca: si
// un torneo típico diera 0,3 sellos, el tope de 3 sería decorativo; si diera 15,
// estaría siempre lleno y sobraría la mitad de las reglas.
const porPartida = totalSellos / rows.length;
console.log(`\nproducción: ${porPartida.toFixed(3)} sellos por partida`);
for (const t of [10, 15, 20]) {
  console.log(`  torneo de ${String(t).padStart(2)} partidas → ${(porPartida * t).toFixed(2)} sellos`);
}
assert(porPartida * 10 >= 1, "en 10 partidas casi nadie llegaría a tener un sello");
assert(porPartida * 10 <= SEAL_CAP * 2, `en 10 partidas se generarían ${(porPartida * 10).toFixed(1)}: el tope de ${SEAL_CAP} sería una pared constante`);

console.log("\nOK: rachas, casos límite, frecuencias y tope dentro de lo previsto.");
