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
  /** Qué tiene que hacer el jugador, en una frase. Se muestra en la ficha. */
  how: string;
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
  { key: "doubleAces", name: "Doble barrido", how: "Que tu equipo consiga dos aces (matar a los cinco enemigos) en la misma partida.", scope: "equipo", points: 100, rate: 0.20 },
  { key: "multiTurretRiftHeraldCount", name: "Tren de asedio", how: "Que el Heraldo de la Grieta derribe dos o más torretas en una sola embestida.", scope: "equipo", points: 100, rate: 0.45 },
  { key: "acesBefore15Minutes", name: "Barrido temprano", how: "Que tu equipo mate a los cinco enemigos antes del minuto 15.", scope: "equipo", points: 100, rate: 0.70 },
  { key: "hadOpenNexus", name: "Desde las cenizas", how: "Seguir en pie con el nexo ya expuesto: el rival tumbó tus inhibidores y las torres del nexo.", scope: "equipo", points: 50, rate: 1.75, threshold: true },
  { key: "elderDragonKillsWithOpposingSoul", name: "Robo de partida", how: "Matar al Dragón Ancestral cuando el equipo enemigo ya tiene el alma de dragón.", scope: "equipo", points: 50, rate: 2.20 },
  { key: "teamElderDragonKills", name: "Furia ancestral", how: "Que tu equipo mate al Dragón Ancestral.", scope: "equipo", points: 20, rate: 6.09 },
  { key: "perfectDragonSoulsTaken", name: "Alma limpia", how: "Conseguir el alma de dragón sin cederle ni un solo dragón al rival.", scope: "equipo", points: 20, rate: 9.13 },
  { key: "flawlessAces", name: "Barrido perfecto", how: "Que tu equipo mate a los cinco enemigos sin perder a nadie en el intento.", scope: "equipo", points: 8, rate: 15.32 },
  { key: "firstTurretKilled", name: "Primera sangre en piedra", how: "Que tu equipo derribe la primera torreta de la partida.", scope: "equipo", points: 3, rate: 49.20, threshold: true },
  { key: "teamBaronKills", name: "Nashor", how: "Que tu equipo mate al Barón Nashor.", scope: "equipo", points: 3, rate: 44.51 },

  // ── Individuales, alcanzables por los cinco roles ─────────────────────────
  { key: "blastConeOppositeOpponentCount", name: "Vuelo inesperado", how: "Usar un Cono Explosivo para saltar por encima de un enemigo y caer al otro lado.", scope: "individual", points: 50, rate: 2.01 },
  { key: "survivedSingleDigitHpCount", name: "Un hilo de vida", how: "Sobrevivir a una pelea quedándote con menos de 10 puntos de vida.", scope: "individual", points: 20, rate: 5.71 },
  { key: "firstBloodKill", name: "Primera sangre", how: "Dar el golpe final a la primera muerte de la partida.", scope: "individual", points: 20, rate: 9.97, threshold: true },
  { key: "wardsGuarded", name: "Guardaespaldas", how: "Defender un guardián de tu equipo evitando que el rival lo destruya.", scope: "individual", points: 8, rate: 29.83 },
  { key: "baronTakedowns", name: "A por Nashor", how: "Estar presente en la muerte del Barón Nashor (no hace falta el último golpe).", scope: "individual", points: 3, rate: 33.42 },
  { key: "killsUnderOwnTurret", name: "Defensa del hogar", how: "Matar a un enemigo bajo tu propia torreta.", scope: "individual", points: 3, rate: 45.03 },
  { key: "visionScoreAdvantageLaneOpponent", name: "Ojo dominante", how: "Terminar con más puntuación de visión que tu oponente directo de carril.", scope: "individual", points: 3, rate: 49.67, threshold: true },
  { key: "controlWardTimeCoverageInRiverOrEnemyHalf", name: "Territorio tomado", how: "Mantener guardianes de control vivos en el río o en la mitad enemiga buena parte de la partida.", scope: "individual", points: 3, rate: 40.99, threshold: true },

  // ── Firma de rol: 5 puntos fijos, iguales en los cinco ────────────────────
  { key: "teleportTakedowns", name: "Llegada oportuna", how: "Participar en una muerte justo después de aparecer con Teleport.", scope: "TOP", points: 5, rate: 5.23 },
  // El umbral de "mucho daño" no lo publica Riot; sabemos que salta en el 5,4%
  // de las actuaciones y que premia a los campeones que aguantan.
  { key: "tookLargeDamageSurvived", name: "Muro de carne", how: "Entrar a la pelea, comerte encima todo el combo del rival y salir vivo. Aguantar una ráfaga brutal de daño en pocos segundos sin morir.", scope: "TOP", points: 5, rate: 5.39 },
  { key: "quickSoloKills", name: "Multikill relámpago", how: "Matar a un enemigo tú solo, sin ayuda de nadie, en cuestión de segundos.", scope: "JUNGLE", points: 5, rate: 5.52 },
  { key: "riftHeraldTakedowns", name: "Heraldo", how: "Estar presente en la muerte del Heraldo de la Grieta.", scope: "JUNGLE", points: 5, rate: 18.57 },
  { key: "multiKillOneSpell", name: "Multikill de un golpe", how: "Matar a dos o más enemigos con un solo hechizo.", scope: "MIDDLE", points: 5, rate: 5.10 },
  { key: "killsOnOtherLanesEarlyJungleAsLaner", name: "Itinerante", how: "Siendo laner, bajar a matar a otro carril durante los primeros minutos.", scope: "MIDDLE", points: 5, rate: 7.94 },
  { key: "multikillsAfterAggressiveFlash", name: "Flash hacia delante", how: "Encadenar un multikill justo después de usar Flash de forma agresiva.", scope: "BOTTOM", points: 5, rate: 6.21 },
  { key: "takedownsInAlcove", name: "Sin salida", how: "Participar en muertes dentro del recoveco, el hueco lateral junto al carril.", scope: "BOTTOM", points: 5, rate: 13.21 },
  { key: "highestCrowdControlScore", name: "Cadena de control", how: "Terminar con la mayor puntuación de control de masas de los diez jugadores.", scope: "UTILITY", points: 5, rate: 10.00, threshold: true },
  { key: "twoWardsOneSweeperCount", name: "Dos de un golpe", how: "Destruir dos guardianes con un solo uso del Barredor.", scope: "UTILITY", points: 5, rate: 10.85 },
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
