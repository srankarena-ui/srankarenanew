// Los 20 retos fijos de torneo. Cada jugador tiene los mismos 18 del fondo
// común más los 2 de su rol, así que la oportunidad es la misma para todos.
//
// `rate` es el porcentaje de actuaciones que lo consiguen, medido sobre 10.020
// actuaciones reales del parche 16.15 (ver docs/retos-verificacion.md). De ahí
// salen los puntos: lo raro paga más. Regenerable con
// scripts/collect-challenges.mjs + scripts/analyze-feats.mjs.

export type FeatScope = "equipo" | "individual" | Role;
export type Role = "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY";

export interface Feat {
  /** Clave en el bloque `challenges` de match-v5, o campo del participante. */
  key: string;
  name: string;
  scope: FeatScope;
  points: number;
  /** % de actuaciones que lo consiguen. Solo informativo, para explicarlo. */
  rate: number;
  /**
   * Umbral: no es un contador sino una diferencia, una cobertura o una
   * bandera. Se cumple una vez y paga una vez — multiplicar por su valor daría
   * puntos fraccionarios sin sentido.
   */
  threshold?: boolean;
}

export const FEATS: Feat[] = [
  // ── De equipo: Riot los acredita a los cinco jugadores por igual ──────────
  { key: "doubleAces", name: "Doble barrido", scope: "equipo", points: 100, rate: 0.20 },
  { key: "multiTurretRiftHeraldCount", name: "Tren de asedio", scope: "equipo", points: 100, rate: 0.45 },
  { key: "acesBefore15Minutes", name: "Barrido temprano", scope: "equipo", points: 100, rate: 0.70 },
  { key: "hadOpenNexus", name: "Desde las cenizas", scope: "equipo", points: 50, rate: 1.75, threshold: true },
  { key: "elderDragonKillsWithOpposingSoul", name: "Robo de partida", scope: "equipo", points: 50, rate: 2.20 },
  { key: "teamElderDragonKills", name: "Furia ancestral", scope: "equipo", points: 20, rate: 6.09 },
  { key: "perfectDragonSoulsTaken", name: "Alma limpia", scope: "equipo", points: 20, rate: 9.13 },
  { key: "flawlessAces", name: "Barrido perfecto", scope: "equipo", points: 8, rate: 15.32 },
  { key: "firstTurretKilled", name: "Primera sangre en piedra", scope: "equipo", points: 3, rate: 49.20, threshold: true },
  { key: "teamBaronKills", name: "Nashor", scope: "equipo", points: 3, rate: 44.51 },

  // ── Individuales, alcanzables por los cinco roles ─────────────────────────
  { key: "blastConeOppositeOpponentCount", name: "Vuelo inesperado", scope: "individual", points: 50, rate: 2.01 },
  { key: "survivedSingleDigitHpCount", name: "Un hilo de vida", scope: "individual", points: 20, rate: 5.71 },
  { key: "firstBloodKill", name: "Primera sangre", scope: "individual", points: 20, rate: 9.97, threshold: true },
  { key: "wardsGuarded", name: "Guardaespaldas", scope: "individual", points: 8, rate: 29.83 },
  { key: "baronTakedowns", name: "A por Nashor", scope: "individual", points: 3, rate: 33.42 },
  { key: "killsUnderOwnTurret", name: "Defensa del hogar", scope: "individual", points: 3, rate: 45.03 },
  { key: "visionScoreAdvantageLaneOpponent", name: "Ojo dominante", scope: "individual", points: 3, rate: 49.67, threshold: true },
  { key: "controlWardTimeCoverageInRiverOrEnemyHalf", name: "Territorio tomado", scope: "individual", points: 3, rate: 40.99, threshold: true },

  // ── Firma de rol: 5 puntos fijos, iguales en los cinco ────────────────────
  { key: "teleportTakedowns", name: "Llegada oportuna", scope: "TOP", points: 5, rate: 5.23 },
  { key: "tookLargeDamageSurvived", name: "Muro de carne", scope: "TOP", points: 5, rate: 5.39 },
  { key: "quickSoloKills", name: "Multikill relámpago", scope: "JUNGLE", points: 5, rate: 5.52 },
  { key: "riftHeraldTakedowns", name: "Heraldo", scope: "JUNGLE", points: 5, rate: 18.57 },
  { key: "multiKillOneSpell", name: "Multikill de un golpe", scope: "MIDDLE", points: 5, rate: 5.10 },
  { key: "killsOnOtherLanesEarlyJungleAsLaner", name: "Itinerante", scope: "MIDDLE", points: 5, rate: 7.94 },
  { key: "multikillsAfterAggressiveFlash", name: "Flash hacia delante", scope: "BOTTOM", points: 5, rate: 6.21 },
  { key: "takedownsInAlcove", name: "Sin salida", scope: "BOTTOM", points: 5, rate: 13.21 },
  { key: "highestCrowdControlScore", name: "Cadena de control", scope: "UTILITY", points: 5, rate: 10.00, threshold: true },
  { key: "twoWardsOneSweeperCount", name: "Dos de un golpe", scope: "UTILITY", points: 5, rate: 10.85 },
];

const ROLES: Role[] = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
const isRole = (s: FeatScope): s is Role => (ROLES as string[]).includes(s);

/** Los 20 que le aplican a un rol: los 18 comunes más sus 2 de firma. */
export function featsForRole(role: string): Feat[] {
  return FEATS.filter((f) => !isRole(f.scope) || f.scope === role);
}

export interface EarnedFeat {
  key: string;
  name: string;
  count: number;
  points: number;
}

/**
 * Retos conseguidos en una partida. `values` son las métricas del participante
 * (bloque `challenges` de match-v5 más los campos sueltos como pentaKills).
 */
export function evaluateFeats(role: string, values: Record<string, unknown>): EarnedFeat[] {
  const earned: EarnedFeat[] = [];

  for (const feat of featsForRole(role)) {
    const raw = values[feat.key];
    const n = raw === true ? 1 : typeof raw === "number" ? raw : 0;
    if (n <= 0) continue;

    // Los de umbral pagan una vez; los contadores, por cada repetición entera.
    const count = feat.threshold ? 1 : Math.floor(n);
    if (count <= 0) continue;

    earned.push({ key: feat.key, name: feat.name, count, points: feat.points * count });
  }

  return earned;
}

export const featPoints = (earned: EarnedFeat[]) => earned.reduce((sum, f) => sum + f.points, 0);
