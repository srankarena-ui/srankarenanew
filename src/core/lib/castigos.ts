// Los castigos que puede tocar la ruleta al gastar un sello.
//
// Todos son verificables con match-v5 a propósito. Los que necesitan el cliente
// de escritorio (hechizos cambiados, sensibilidad del ratón) quedan fuera del
// sorteo: si al que le toca no tiene el cliente abierto no se le puede
// comprobar, y eso se percibe como injusto o se explota cerrándolo. Ver
// docs/retos-verificacion.md.

import type { Role } from "./challenge-conditions";

export interface Castigo {
  key: string;
  name: string;
  /** Qué tiene que hacer —o no hacer— el castigado. */
  how: string;
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

export const CASTIGOS: Castigo[] = [
  {
    key: "sin_flash",
    name: "Sin Flash",
    how: "Jugar la partida sin llevar Destello.",
    dureza: 2,
  },
  {
    key: "sin_botas",
    name: "Sin botas",
    how: "No comprar botas en toda la partida.",
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
    name: "Sin guardianes de control",
    how: "No comprar ni un guardián de control en toda la partida.",
    // Para un support es la mitad de su trabajo; para el resto es una molestia.
    roles: ALL_ROLES.filter((r) => r !== "UTILITY"),
    dureza: 2,
  },
  {
    key: "sin_consumibles",
    name: "Sin consumibles",
    how: "Nada de pociones, elixires ni consumibles en toda la partida.",
    dureza: 2,
  },
  {
    key: "presupuesto",
    name: "Presupuesto ajustado",
    how: "No comprar ningún objeto que cueste más de 1600 de oro.",
    dureza: 3,
  },
  {
    key: "sin_prender",
    name: "Sin Prender",
    how: "Jugar sin llevar Prender.",
    dureza: 1,
  },
  {
    key: "ulti_tres_veces",
    name: "Ultimate racionada",
    how: "Usar tu definitiva tres veces como mucho en toda la partida.",
    dureza: 3,
  },
  {
    key: "sin_pings",
    name: "Silencio",
    how: "No usar ni un solo ping en toda la partida. Riot cuenta los trece tipos por separado, así que se comprueba sumándolos.",
    dureza: 1,
  },
  {
    key: "secundario_seis",
    name: "Usa el otro",
    how: "Usar tu hechizo de invocador secundario al menos seis veces.",
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

/** Los que se le pueden imponer a ese rol. Sin rol conocido, solo los de todos. */
export function castigosParaRol(role: string | null): Castigo[] {
  return CASTIGOS.filter((c) => {
    if (!c.roles) return true;
    if (!role) return false; // sin saber su rol, no arriesgar uno que lo rompa
    return c.roles.includes(role as Role);
  });
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
