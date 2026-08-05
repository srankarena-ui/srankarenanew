// Cómo se gana un sello, la moneda con la que un jugador le impone un castigo
// a otro.
//
// `rate` es el porcentaje de actuaciones que cumple la regla, medido sobre las
// 10.020 actuaciones reales del parche 16.15 (data/challenges.jsonl). Las
// rachas no llevan `rate`: ese dataset son actuaciones sueltas, no secuencias
// por jugador, así que no hay nada que medir — la estimación aritmética para un
// jugador del 50% es ~3% de las ventanas de 5 partidas.

export interface SealRule {
  key: string;
  name: string;
  /** Qué hay que hacer, en una frase. */
  how: string;
  /** % de actuaciones que lo cumplen. Ausente = no medible con el dataset. */
  rate?: number;
}

export const SEAL_RULES: SealRule[] = [
  // ── Por dominar ───────────────────────────────────────────────────────────
  {
    key: "kda_perfecto",
    name: "KDA perfecto",
    how: "Terminar con una muerte como mucho, más del 50% de participación y al menos 8 participaciones. Morir una vez cuenta igual que no morir: Riot divide entre 1 en los dos casos, así que el número es el mismo.",
    rate: 1.72,
  },
  { key: "masacre", name: "Masacre", how: "22 asesinatos o más en una sola partida.", rate: 1.37 },
  {
    key: "orquesta",
    name: "Orquesta",
    how: "30 asistencias o más en una sola partida. El equivalente de la masacre para quien no remata: sale igual de raro.",
    rate: 0.68,
  },
  { key: "kda_20", name: "KDA de 20", how: "Terminar con un KDA superior a 20.", rate: 0.77 },
  { key: "cuadrakill", name: "Cuadrakill", how: "Matar a cuatro enemigos tú solo.", rate: 0.88 },
  {
    key: "maraton",
    name: "Maratón",
    how: "Ganar una partida de 40 minutos o más.",
    rate: 5.99,
  },
  { key: "pentakill", name: "Pentakill", how: "Matar a los cinco enemigos tú solo.", rate: 0.10 },
  {
    key: "doble_barrido",
    name: "Doble barrido",
    how: "Que tu equipo consiga dos aces en la misma partida.",
    rate: 0.20,
  },
  {
    key: "desde_las_cenizas",
    name: "Desde las cenizas",
    how: "Seguir en pie con el nexo ya expuesto y ganar la partida.",
    rate: 1.75,
  },
  {
    key: "robo_ancestral",
    name: "Robo de partida",
    how: "Matar al Dragón Ancestral con el alma de dragón ya en manos del rival.",
    rate: 2.20,
  },
  {
    key: "carga_de_dano",
    name: "Carga del equipo",
    how: "Hacer más del 35% del daño a campeones de todo tu equipo.",
    rate: 3.32,
  },

  // ── Por constancia y por sufrir ───────────────────────────────────────────
  {
    key: "racha_victorias",
    name: "Cinco seguidas",
    how: "Ganar cinco partidas seguidas dentro del torneo.",
  },
  {
    key: "racha_derrotas",
    name: "Consuelo",
    how: "Perder cinco partidas seguidas. El sello también tiene que llegarle a quien lo está pasando mal, o solo circula entre los de arriba.",
  },
  {
    key: "carga_derrotada",
    name: "Cargaste y perdiste",
    how: "Perder habiendo hecho más del 30% del daño de tu equipo.",
    rate: 4.62,
  },
];

/** Lo mínimo que necesita una regla para decidir. Coincide con MatchStats. */
export interface SealMatchInput {
  win: boolean;
  deaths: number;
  kills: number;
  assists: number;
  /** 0-100. */
  killParticipation: number;
  pentaKills: number;
  /** 0-1, del bloque `challenges` de match-v5. */
  teamDamagePercentage: number;
  quadraKills: number;
  /** Segundos. */
  gameDuration: number;
  /** Claves de los retos de torneo conseguidos en esa partida. */
  featKeys: string[];
}

/**
 * Tope de sellos sin gastar. Con las reglas actuales un jugador gana ~2,4 en un
 * torneo de 10 partidas y ~4,7 en uno de 20: en el corto casi nunca se llena, en
 * el largo le obliga a gastar, que es para lo que está el tope.
 */
export const SEAL_CAP = 3;

/** Reglas que se deciden mirando una sola partida. */
export function sealsForMatch(s: SealMatchInput): string[] {
  const earned: string[] = [];

  // Una muerte cuenta igual que ninguna, pero con suelo de participación: un
  // 2/1/1 en una partida de cuatro asesinatos cumpliría "sin morir y KP alta"
  // sin haber hecho nada. El suelo solo descarta ese caso (2,13% → 1,77%).
  if (s.deaths <= 1 && s.killParticipation > 50 && s.kills + s.assists >= 8) {
    earned.push("kda_perfecto");
  }

  if (s.kills >= 22) earned.push("masacre");
  if (s.assists >= 30) earned.push("orquesta");
  if ((s.kills + s.assists) / Math.max(1, s.deaths) > 20) earned.push("kda_20");
  if (s.quadraKills > 0) earned.push("cuadrakill");
  if (s.win && s.gameDuration >= 2400) earned.push("maraton");

  if (s.pentaKills > 0) earned.push("pentakill");
  if (s.featKeys.includes("doubleAces")) earned.push("doble_barrido");
  if (s.featKeys.includes("hadOpenNexus") && s.win) earned.push("desde_las_cenizas");
  if (s.featKeys.includes("elderDragonKillsWithOpposingSoul")) earned.push("robo_ancestral");
  if (s.teamDamagePercentage > 0.35) earned.push("carga_de_dano");
  if (!s.win && s.teamDamagePercentage > 0.30) earned.push("carga_derrotada");

  return earned;
}

export const STREAK_LENGTH = 5;

/**
 * Rachas sobre las partidas del torneo, en orden cronológico. Devuelve la
 * partida en la que se cierra cada racha, que es la que identifica el sello:
 * así una racha de 7 victorias paga en la 5ª y en la 6ª y en la 7ª —cada
 * ventana de cinco es una racha— pero reejecutar el sync no paga de nuevo.
 */
export function sealsForStreaks(
  matches: Array<{ win: boolean; matchId: string }>
): Array<{ reason: string; matchId: string }> {
  const out: Array<{ reason: string; matchId: string }> = [];
  let run = 0;
  let runWin: boolean | null = null;

  for (const m of matches) {
    if (m.win === runWin) run++;
    else {
      runWin = m.win;
      run = 1;
    }
    if (run >= STREAK_LENGTH) {
      out.push({ reason: m.win ? "racha_victorias" : "racha_derrotas", matchId: m.matchId });
    }
  }

  return out;
}

export const sealRule = (key: string) => SEAL_RULES.find((r) => r.key === key);
