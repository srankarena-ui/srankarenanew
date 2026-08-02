// Lógica pura de los retos: qué forma tiene una condición, cómo se valida lo
// que guarda el admin, y cómo se evalúa contra los datos de una partida.
// Sin red ni Supabase — la usan por igual el reporte en vivo del cliente de
// escritorio y el job de sync contra match-v5.

// Riot usa estos mismos valores en la Live Client Data API (`position`) y en
// match-v5 (`teamPosition`), así que no hace falta traducir entre ambas.
export const ROLES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"] as const;
export type Role = (typeof ROLES)[number];

export type ChallengeCondition =
  // El campeón va por nombre ("Jhin"): es lo que dan tanto la Live Client Data
  // API como match-v5, y lo que ya usa el resto del proyecto. El id numérico
  // solo hace falta para champion-mastery-v4 y lo resuelve el backend.
  | { type: "champion_mastery"; champion: string; min_points: number }
  | { type: "role_played"; role: Role }
  | { type: "queue_played"; queue_id: number }
  | { type: "and"; conditions: ChallengeCondition[] }
  | { type: "or"; conditions: ChallengeCondition[] };

// Lo que se sabe de la partida al momento de evaluar. Todo opcional: el cliente
// en vivo no conoce la maestría (la resuelve el backend) ni la cola, y el
// historial no siempre trae todo.
export interface MatchFacts {
  champion?: string;
  role?: string;
  queueId?: number;
  masteryPoints?: number;
}

export function evaluateCondition(condition: ChallengeCondition, facts: MatchFacts): boolean {
  switch (condition.type) {
    case "champion_mastery":
      return facts.champion === condition.champion
        && (facts.masteryPoints ?? -1) >= condition.min_points;
    case "role_played":
      return facts.role === condition.role;
    case "queue_played":
      return facts.queueId === condition.queue_id;
    case "and":
      return condition.conditions.every((c) => evaluateCondition(c, facts));
    case "or":
      return condition.conditions.some((c) => evaluateCondition(c, facts));
  }
}

// El campeón exigido por la condición, para que el backend sepa de cuál pedir
// la maestría sin repetir el recorrido del árbol en cada llamador.
export function masteryChampion(condition: ChallengeCondition): string | null {
  if (condition.type === "champion_mastery") return condition.champion;
  if (condition.type === "and" || condition.type === "or") {
    for (const sub of condition.conditions) {
      const champion = masteryChampion(sub);
      if (champion) return champion;
    }
  }
  return null;
}

// ¿El job de sync puede verificar esto solo con el historial (match-v5), sin
// que el cliente de escritorio haya estado abierto? La maestría es un valor
// acumulado consultable en cualquier momento, y campeón/rol/cola quedan en el
// historial — así que hoy todos los tipos lo son. Cuando se agregue una
// condición sobre estado transitorio de la partida (algo que match-v5 no
// registre), devolver false para ella: el sync la salta y solo la puede
// verificar el reporte en vivo.
export function isPostGameVerifiable(condition: ChallengeCondition): boolean {
  switch (condition.type) {
    case "champion_mastery":
    case "role_played":
    case "queue_played":
      return true;
    case "and":
    case "or":
      return condition.conditions.every(isPostGameVerifiable);
  }
}

// ponytail: tope de anidamiento para no reventar el stack con un JSON absurdo;
// subirlo si algún reto real necesita más de 3 niveles de and/or.
const MAX_DEPTH = 3;

// Valida lo que viene de la BD o del panel de admin. Devuelve null si la forma
// no es válida, para que quien llame decida (400 al admin, saltar el reto en
// el sync) en vez de evaluar basura como si fuera una condición.
export function parseCondition(raw: unknown, depth = 0): ChallengeCondition | null {
  if (depth > MAX_DEPTH) return null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const c = raw as Record<string, unknown>;
  switch (c.type) {
    case "champion_mastery":
      return typeof c.champion === "string" && c.champion.trim() !== "" && isNonNegativeInt(c.min_points)
        ? { type: "champion_mastery", champion: c.champion, min_points: c.min_points as number }
        : null;
    case "role_played":
      return ROLES.includes(c.role as Role)
        ? { type: "role_played", role: c.role as Role }
        : null;
    case "queue_played":
      return isPositiveInt(c.queue_id)
        ? { type: "queue_played", queue_id: c.queue_id as number }
        : null;
    case "and":
    case "or": {
      if (!Array.isArray(c.conditions) || c.conditions.length === 0) return null;
      const parsed = c.conditions.map((sub) => parseCondition(sub, depth + 1));
      if (parsed.some((p) => p === null)) return null;
      return { type: c.type, conditions: parsed as ChallengeCondition[] };
    }
    default:
      return null;
  }
}

function isPositiveInt(v: unknown): boolean {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

function isNonNegativeInt(v: unknown): boolean {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}
