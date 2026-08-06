// Los castigos que puede tocar la ruleta al gastar un sello.
//
// Todos son verificables con match-v5 a propósito. Los que necesitan el cliente
// de escritorio (hechizos cambiados, sensibilidad del ratón) quedan fuera del
// sorteo: si al que le toca no tiene el cliente abierto no se le puede
// comprobar, y eso se percibe como injusto o se explota cerrándolo. Ver
// docs/retos-verificacion.md.

import type { Role } from "./challenge-conditions";

/**
 * Lo que se sabe de la partida al comprobar un castigo. Todo sale del
 * participante de match-v5 que el sync ya descarga, salvo `compróBotas` y
 * `objetoMasCaro`, que necesitan el catálogo de Data Dragon.
 */
export interface CastigoFacts {
  /** IDs de los dos hechizos de invocador. Destello es 4, Prender 14. */
  hechizos: [number, number];
  /** Veces que usó cada hechizo de invocador. */
  usosHechizos: [number, number];
  /** Lanzamientos de la definitiva (`spell4Casts`). */
  usosUlti: number;
  visionWardsBought: number;
  consumablesPurchased: number;
  /** Suma de los catorce tipos de ping. */
  pings: number;
  comproBotas: boolean;
  /** Oro del objeto más caro que terminó llevando. */
  objetoMasCaro: number;
}

export interface Castigo {
  key: string;
  name: string;
  /** Qué tiene que hacer —o no hacer— el castigado. */
  how: string;
  /**
   * Devuelve true si lo cumplió. Sin esta función el castigo no entra en la
   * ruleta: imponer algo que no sabemos comprobar convierte el sistema en un
   * pacto de honor, y en directo eso no se sostiene.
   */
  verify?: (f: CastigoFacts) => boolean;
  /**
   * Roles a los que se le puede imponer. Ausente = a cualquiera.
   *
   * Existe porque un sorteo ciego es injusto: hay castigos que para un rol son
   * una molestia y para otro son no poder jugar.
   */
  roles?: Role[];
  /**
   * Cuánto estorba, de 1 a 3. La ruleta pesa por lo contrario: los más duros
   * salen menos, para que un sello no sea una condena la mitad de las veces.
   */
  dureza: 1 | 2 | 3;
}

const ALL_ROLES: Role[] = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

/**
 * Lo que cuesta rechazar un castigo.
 *
 * Tiene que doler más que cumplirlo, o nadie cumpliría ninguno. Medido sobre
 * 10.020 partidas reales: una partida media vale 92,6 puntos, y entre ganarla y
 * perderla hay 76,4. Así que cumplir un castigo cuesta como mucho 76,4 —el caso
 * en que te hace perder—, y 100 se queda justo por encima sin ser una condena.
 */
export const REJECTION_PENALTY = 100;

export const CASTIGOS: Castigo[] = [
  {
    key: "sin_flash",
    verify: (f) => !f.hechizos.includes(4),
    name: "Sin Flash",
    how: "Jugar la partida sin llevar Destello.",
    dureza: 2,
  },
  {
    key: "sin_botas",
    verify: (f) => !f.comproBotas,
    name: "Sin botas",
    how: "Terminar la partida sin botas en el inventario. Se miran los objetos finales, así que venderlas antes de acabar también vale.",
    dureza: 2,
  },
  {
    key: "campeon_aleatorio",
    name: "Campeón aleatorio",
    how: "Jugar el campeón que te toque en el sorteo, elegido solo entre los que ya tienes.",
    dureza: 3,
  },
  {
    key: "sin_guardianes_control",
    verify: (f) => f.visionWardsBought === 0,
    name: "Sin guardianes de control",
    how: "No comprar ni un guardián de control en toda la partida.",
    // Para un support es la mitad de su trabajo; para el resto es una molestia.
    roles: ALL_ROLES.filter((r) => r !== "UTILITY"),
    dureza: 2,
  },
  {
    key: "sin_consumibles",
    verify: (f) => f.consumablesPurchased === 0,
    name: "Sin consumibles",
    how: "Nada de pociones, elixires ni consumibles en toda la partida.",
    dureza: 2,
  },
  {
    key: "presupuesto",
    verify: (f) => f.objetoMasCaro <= 1600,
    name: "Presupuesto ajustado",
    how: "Terminar la partida sin ningún objeto de más de 1600 de oro. Se miran los objetos finales, no las compras.",
    dureza: 3,
  },
  {
    key: "sin_prender",
    verify: (f) => !f.hechizos.includes(14),
    name: "Sin Prender",
    how: "Jugar sin llevar Prender.",
    dureza: 1,
  },
  {
    key: "ulti_tres_veces",
    verify: (f) => f.usosUlti <= 3,
    name: "Ultimate racionada",
    how: "Usar tu definitiva tres veces como mucho en toda la partida.",
    dureza: 3,
  },
  {
    key: "sin_pings",
    verify: (f) => f.pings === 0,
    name: "Silencio",
    how: "No usar ni un solo ping en toda la partida. Riot cuenta los catorce tipos por separado, así que se comprueba sumándolos.",
    dureza: 1,
  },
  {
    key: "secundario_seis",
    verify: (f) => Math.min(...f.usosHechizos) >= 6,
    name: "Usa el otro",
    how: "Usar tus dos hechizos de invocador al menos seis veces cada uno. Se piden los dos y no «el secundario» porque el orden de las teclas lo elige cada jugador: no hay un secundario que Riot distinga.",
    dureza: 1,
  },
  {
    key: "campeon_bajo",
    name: "Fuera de tu zona",
    how: "Jugar un campeón con menos de 5.000 puntos de maestría.",
    dureza: 2,
  },
  {
    key: "sin_tus_tres",
    name: "Sin tus favoritos",
    how: "No jugar ninguno de tus tres campeones más jugados. Se congelan al imponerte el castigo, así que no vale cambiarlos después.",
    dureza: 2,
  },
];

/** Peso en la ruleta: lo más duro sale menos. Dureza 1 → 3, 2 → 2, 3 → 1. */
const peso = (c: Castigo) => 4 - c.dureza;

/** Los que sabemos comprobar. Solo estos entran en la ruleta. */
export const CASTIGOS_VERIFICABLES = CASTIGOS.filter((c) => c.verify);

/** Los que se le pueden imponer a ese rol. Sin rol conocido, solo los de todos. */
export function castigosParaRol(role: string | null): Castigo[] {
  return CASTIGOS_VERIFICABLES.filter((c) => {
    if (!c.roles) return true;
    if (!role) return false; // sin saber su rol, no arriesgar uno que lo rompa
    return c.roles.includes(role as Role);
  });
}

/**
 * ¿Cumplió el castigo en esa partida? `null` si no se sabe comprobar —no
 * debería pasar, porque la ruleta solo reparte verificables, pero un castigo
 * antiguo guardado en base puede serlo.
 */
export function verificarCastigo(key: string, f: CastigoFacts): boolean | null {
  const c = castigo(key);
  return c?.verify ? c.verify(f) : null;
}

/**
 * Gira la ruleta. `random` se inyecta para poder comprobarlo: un sorteo que solo
 * se puede observar en producción no se puede verificar.
 */
export function rollCastigo(role: string | null, random: () => number = Math.random): Castigo {
  const pool = castigosParaRol(role);
  if (!pool.length) throw new Error(`Sin castigos aplicables al rol ${role}`);

  const total = pool.reduce((a, c) => a + peso(c), 0);
  let n = random() * total;
  for (const c of pool) {
    n -= peso(c);
    if (n < 0) return c;
  }
  return pool[pool.length - 1]; // solo por redondeo en coma flotante
}

export const castigo = (key: string) => CASTIGOS.find((c) => c.key === key);
