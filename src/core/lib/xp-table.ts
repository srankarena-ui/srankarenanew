// XP por puesto o rango de un torneo — hermana de prize-table.ts (mismo
// {from, to}, misma razón de ser: puestos que empatan), pero el premio es un
// número de XP en vez de texto libre. placementLabel/medalFor son genéricas
// sobre {from, to} y se reutilizan tal cual desde prize-table.ts.

export interface XpRow {
  from: number;
  to: number;
  /** XP otorgada a ese puesto o rango. */
  xp: number;
}

/**
 * Valida y limpia lo que venga del formulario o de la base de datos. Descarta
 * filas sin XP o con rangos imposibles, y las ordena por puesto — mismo
 * criterio que parsePrizeTable.
 */
export function parseXpTable(raw: unknown): XpRow[] {
  if (!Array.isArray(raw)) return [];

  const rows: XpRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;

    const from = Math.trunc(Number(r.from));
    const to = Math.trunc(Number(r.to ?? r.from));
    const xp = Math.trunc(Number(r.xp));

    if (!Number.isFinite(from) || from < 1) continue;
    if (!Number.isFinite(to) || to < from) continue;
    if (!Number.isFinite(xp) || xp <= 0) continue;

    rows.push({ from, to, xp });
  }

  return rows.sort((a, b) => a.from - b.from || a.to - b.to);
}

/** Rangos que se pisan: el mismo puesto no puede ganar XP dos veces. */
export function overlappingXpRows(rows: XpRow[]): XpRow[] {
  const sorted = [...rows].sort((a, b) => a.from - b.from);
  const bad: XpRow[] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].from <= sorted[i - 1].to) bad.push(sorted[i]);
  }
  return bad;
}
