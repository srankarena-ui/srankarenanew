// Premios por puesto de un torneo. Cada fila cubre un puesto suelto (3º) o un
// rango (3º-4º, 5º-8º), porque según el formato hay posiciones que empatan:
// los dos semifinalistas comparten el 3º-4º, los cuatro de cuartos el 5º-8º.

export interface PrizeRow {
  from: number;
  to: number;
  /** Texto libre: "500 RP", "50€", "Skin a elegir". */
  prize: string;
}

export const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

/** "1º", "3º-4º", "5º-8º" */
export function placementLabel(row: Pick<PrizeRow, "from" | "to">): string {
  return row.from === row.to ? `${row.from}º` : `${row.from}º-${row.to}º`;
}

/** La medalla del puesto más alto que cubre la fila, si entra en el podio. */
export function medalFor(row: Pick<PrizeRow, "from">): string | null {
  return MEDALS[row.from] ?? null;
}

/**
 * Valida y limpia lo que venga del formulario o de la base de datos. Descarta
 * filas sin premio o con rangos imposibles, y las ordena por puesto — así lo
 * que se pinta siempre tiene sentido aunque el JSON guardado esté sucio.
 */
export function parsePrizeTable(raw: unknown): PrizeRow[] {
  if (!Array.isArray(raw)) return [];

  const rows: PrizeRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;

    const from = Math.trunc(Number(r.from));
    const to = Math.trunc(Number(r.to ?? r.from));
    const prize = typeof r.prize === "string" ? r.prize.trim() : "";

    if (!Number.isFinite(from) || from < 1) continue;
    if (!Number.isFinite(to) || to < from) continue;
    if (!prize) continue;

    rows.push({ from, to, prize });
  }

  return rows.sort((a, b) => a.from - b.from || a.to - b.to);
}

/** Rangos que se pisan: el mismo puesto no puede ganar dos premios. */
export function overlappingRows(rows: PrizeRow[]): PrizeRow[] {
  const sorted = [...rows].sort((a, b) => a.from - b.from);
  const bad: PrizeRow[] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].from <= sorted[i - 1].to) bad.push(sorted[i]);
  }
  return bad;
}
