// Self-check de la puntuación por rol: `node src/core/lib/role-score.test.ts`
import assert from "node:assert/strict";
import { normalize, roleScore, type RoleBaselines, type StatBaseline } from "./role-score.ts";

const b = (p10: number, p25: number, p50: number, p75: number, p90: number): StatBaseline =>
  ({ mean: p50, sd: 1, p10, p25, p50, p75, p90 });

const cs = b(4, 5, 6, 7, 8);

// Los percentiles caen donde deben, y fuera del rango se satura sin pasarse.
assert.equal(normalize(6, cs), 0.5);
assert.equal(normalize(8, cs), 1);
assert.equal(normalize(4, cs), 0);
assert.equal(normalize(99, cs), 1);
assert.equal(normalize(0, cs), 0);
// Interpolación entre dos percentiles: 6.5 está a mitad de p50→p75.
assert.equal(normalize(6.5, cs), 0.625);

// Morir menos puntúa más.
const deaths = b(2, 3, 5, 7, 9);
assert.equal(normalize(5, deaths, true), 0.5);
assert.ok(normalize(2, deaths, true) > normalize(9, deaths, true));

// Baseline plano (stat sin variación) no debe dar NaN.
const flat = b(3, 3, 3, 3, 3);
assert.ok(Number.isFinite(normalize(3, flat)));

// El punto de todo esto: un support en el p90 de visión y un mid en el p90 de
// CS tienen que sacar el mismo puntaje.
const baselines: RoleBaselines = {
  patch: "16.15",
  sampleRows: 100,
  roles: {
    MIDDLE: { n: 50, stats: { cs_per_min: b(4, 5, 6, 7, 8), vision_score: b(15, 20, 25, 30, 35) } },
    UTILITY: { n: 50, stats: { cs_per_min: b(0.5, 1, 1.5, 2, 2.5), vision_score: b(40, 50, 60, 70, 80) } },
  },
};
const weights = { cs_per_min: 1, vision_score: 1 };

const mid = roleScore("MIDDLE", { cs_per_min: 8, vision_score: 25 }, weights, baselines);
const support = roleScore("UTILITY", { cs_per_min: 1.5, vision_score: 80 }, weights, baselines);
assert.equal(mid, support);
assert.equal(mid, 75); // p90 en una (1.0) + p50 en la otra (0.5) → 75/100

// Escala independiente de cuántas stats se midan.
assert.equal(
  roleScore("MIDDLE", { cs_per_min: 6 }, { cs_per_min: 1 }, baselines),
  roleScore("MIDDLE", { cs_per_min: 6, vision_score: 25 }, weights, baselines)
);

// Sin baselines del rol no se inventa un número.
assert.equal(roleScore("JUNGLE", { cs_per_min: 6 }, weights, baselines), null);
// Stats ausentes o basura no rompen ni cuentan.
assert.equal(roleScore("MIDDLE", {}, weights, baselines), null);
assert.equal(roleScore("MIDDLE", { cs_per_min: NaN }, weights, baselines), null);

console.log("role-score: OK");
