// Puntuación comparable entre roles.
//
// El problema: puntuar valores crudos castiga al support en CS y al jungla en
// visión, no porque jueguen peor sino porque la escala de cada rol es otra.
// La solución: no se puntúa el valor, se puntúa *en qué percentil de tu rol
// caes*. Un support en el p90 de visión suma lo mismo que un mid en el p90 de
// CS. Los pesos dicen qué valoramos; la tabla de baselines dice qué es normal
// en cada rol, y se regenera por parche con scripts/analyze-roles.mjs.

export interface StatBaseline {
  mean: number;
  sd: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface RoleBaselines {
  patch: string;
  sampleRows: number;
  roles: Record<string, { n: number; stats: Record<string, StatBaseline> }>;
}

/**
 * Pesos de la puntuación, iguales para todos los torneos y todos los roles.
 *
 * No son configurables a propósito: la escala está calibrada contra 1.002
 * partidas reales y dejar que cada organizador la retoque rompería la
 * comparabilidad entre torneos. `cs_per_min` y `assists` ocupan el mismo hueco
 * —"la estadística que define tu rol"— y solo se pasa la que aplica.
 */
export const SCORING_WEIGHTS: Record<string, number> = {
  kda: 2,
  kill_participation: 2,
  damage_per_min: 2,
  vision_score: 1.5,
  cs_per_min: 1.5,
  assists: 1.5,
  wards_placed: 1,
};

// Morir menos es mejor; todo lo demás suma hacia arriba.
const LOWER_IS_BETTER = new Set(["deaths"]);

const BREAKPOINTS: Array<[keyof StatBaseline, number]> = [
  ["p10", 0.1],
  ["p25", 0.25],
  ["p50", 0.5],
  ["p75", 0.75],
  ["p90", 0.9],
];

// Valor crudo → posición 0..1 dentro de su rol, interpolando entre percentiles.
// Se usan percentiles y no z-score porque estas distribuciones son asimétricas
// (muertes, visión): la media y la desviación mienten, los percentiles no.
export function normalize(value: number, baseline: StatBaseline, lowerIsBetter = false): number {
  let position: number;

  if (value <= baseline.p10) {
    // Por debajo del p10 se sigue interpolando, de 0 a 0.1, en vez de cortar en
    // cero: si no, todo el 10% inferior puntúa igual y una partida mala es
    // indistinguible de una desastrosa.
    position = baseline.p10 > 0 ? Math.max(0, (value / baseline.p10) * 0.1) : 0;
  } else if (value >= baseline.p90) {
    position = 1;
  } else {
    position = 1;
    for (let i = 0; i < BREAKPOINTS.length - 1; i++) {
      const [lowKey, lowP] = BREAKPOINTS[i];
      const [highKey, highP] = BREAKPOINTS[i + 1];
      const low = baseline[lowKey];
      const high = baseline[highKey];

      if (value <= high) {
        // Percentiles iguales (stat sin variación en la muestra): sin
        // interpolar, se cae al borde inferior en vez de dividir por cero.
        position = high === low ? lowP : lowP + ((value - low) / (high - low)) * (highP - lowP);
        break;
      }
    }
  }

  return lowerIsBetter ? 1 - position : position;
}

/**
 * Puntaje 0..100 del rendimiento en una partida, relativo a su rol.
 * `null` si no hay baselines para ese rol — quien llame decide qué hacer
 * (saltar la partida, usar el sistema viejo), en vez de inventar un número.
 */
export function roleScore(
  role: string,
  stats: Record<string, number>,
  weights: Record<string, number>,
  baselines: RoleBaselines
): number | null {
  const roleStats = baselines.roles[role]?.stats;
  if (!roleStats) return null;

  let weighted = 0;
  let totalWeight = 0;

  for (const [stat, weight] of Object.entries(weights)) {
    const baseline = roleStats[stat];
    const value = stats[stat];
    if (!baseline || weight <= 0 || typeof value !== "number" || !Number.isFinite(value)) continue;

    weighted += weight * normalize(value, baseline, LOWER_IS_BETTER.has(stat));
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;

  // Se divide por el peso total para que el puntaje no dependa de cuántas
  // estadísticas se estén midiendo: siempre 0..100.
  return Math.round((weighted / totalWeight) * 10000) / 100;
}
