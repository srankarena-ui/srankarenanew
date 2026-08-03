"use client";

import { medalFor, placementLabel, overlappingRows, type PrizeRow } from "@/core/lib/prize-table";

/**
 * Editor de premios por puesto. Cada fila cubre un puesto suelto o un rango,
 * porque según el formato hay posiciones que empatan: los semifinalistas
 * comparten el 3º-4º y los de cuartos el 5º-8º.
 */
export function PrizeTableEditor({
  rows,
  onChange,
}: {
  rows: PrizeRow[];
  onChange: (rows: PrizeRow[]) => void;
}) {
  const conflictos = new Set(overlappingRows(rows.filter((r) => r.prize.trim())).map((r) => r.from));

  const update = (i: number, patch: Partial<PrizeRow>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  function add() {
    // El siguiente puesto libre, para no tener que pensarlo cada vez.
    const next = rows.length ? Math.max(...rows.map((r) => r.to)) + 1 : 1;
    onChange([...rows, { from: next, to: next, prize: "" }]);
  }

  return (
    <div className="space-y-2">
      {rows.length > 0 && (
        <div className="grid grid-cols-[auto_60px_60px_1fr_auto] items-center gap-2 text-[9px] uppercase tracking-[0.15em] text-gray-600">
          <span className="w-6" />
          <span>Desde</span>
          <span>Hasta</span>
          <span>Premio</span>
          <span className="w-6" />
        </div>
      )}

      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-[auto_60px_60px_1fr_auto] items-center gap-2">
          <span className="w-6 text-center text-base" title={placementLabel(row)}>
            {medalFor(row) ?? <span className="text-[10px] text-gray-600">{row.from}º</span>}
          </span>

          <input
            type="number"
            min={1}
            value={row.from}
            aria-label={`Puesto inicial de la fila ${i + 1}`}
            onChange={(e) => {
              const from = Math.max(1, parseInt(e.target.value) || 1);
              // El final nunca puede quedar antes del inicio.
              update(i, { from, to: Math.max(from, row.to) });
            }}
            className="rounded-lg border border-gray-800 bg-[#0b0e14] px-2 py-1.5 text-center text-xs text-gray-200 outline-hidden focus:border-[var(--color-accent)]"
          />

          <input
            type="number"
            min={row.from}
            value={row.to}
            aria-label={`Puesto final de la fila ${i + 1}`}
            onChange={(e) => update(i, { to: Math.max(row.from, parseInt(e.target.value) || row.from) })}
            className="rounded-lg border border-gray-800 bg-[#0b0e14] px-2 py-1.5 text-center text-xs text-gray-200 outline-hidden focus:border-[var(--color-accent)]"
          />

          <input
            type="text"
            value={row.prize}
            placeholder="500 RP, 50€, skin a elegir…"
            aria-label={`Premio de ${placementLabel(row)}`}
            onChange={(e) => update(i, { prize: e.target.value })}
            className={`rounded-lg border bg-[#0b0e14] px-3 py-1.5 text-xs text-gray-200 outline-hidden focus:border-[var(--color-accent)] ${
              conflictos.has(row.from) ? "border-red-800" : "border-gray-800"
            }`}
          />

          <button
            type="button"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
            aria-label={`Quitar el premio de ${placementLabel(row)}`}
            className="w-6 text-gray-600 transition-colors hover:text-red-400"
          >
            ×
          </button>
        </div>
      ))}

      {conflictos.size > 0 && (
        <p className="text-[10px] text-red-400">
          Hay puestos que aparecen en dos filas: cada posición solo puede ganar un premio.
        </p>
      )}

      <button
        type="button"
        onClick={add}
        className="w-full rounded-lg border border-dashed border-gray-800 py-2 text-[10px] uppercase tracking-[0.2em] text-gray-500 transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      >
        + Añadir puesto
      </button>

      {rows.length === 0 && (
        <p className="text-[10px] text-gray-600">
          Añade un puesto por cada premio. Usa un rango cuando varias posiciones
          ganen lo mismo: 3º-4º para los semifinalistas, 5º-8º para cuartos.
        </p>
      )}
    </div>
  );
}
