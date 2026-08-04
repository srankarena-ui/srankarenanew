"use client";

import { useState } from "react";
import { PrizeTableEditor } from "@/modules/admin/components/PrizeTableEditor";
import { XpTableEditor } from "@/modules/admin/components/XpTableEditor";
import type { PrizeRow } from "@/core/lib/prize-table";
import type { XpRow } from "@/core/lib/xp-table";

const TABS = [
  { key: "prizes" as const, label: "🏆 Prize Pool" },
  { key: "xp" as const, label: "✨ XP Prizes" },
];

/**
 * Ventana única con dos pestañas para los premios por puesto: texto libre
 * ("Prize Pool") y XP ("XP Prizes"). Las filas de ambas viven en el wizard
 * padre, así que cambiar de pestaña no pierde nada.
 */
export function PrizesEditor({
  prizeRows,
  onPrizeRowsChange,
  xpRows,
  onXpRowsChange,
}: {
  prizeRows: PrizeRow[];
  onPrizeRowsChange: (rows: PrizeRow[]) => void;
  xpRows: XpRow[];
  onXpRowsChange: (rows: XpRow[]) => void;
}) {
  const [tab, setTab] = useState<"prizes" | "xp">("prizes");

  return (
    <div className="rounded-xl border border-gray-800 bg-[#0b0e14] p-4">
      <div className="mb-3 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${
              tab === t.key
                ? "bg-[var(--color-accent-hover)]/20 text-[var(--color-accent)]"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "prizes" ? (
        <>
          <p className="mb-3 text-[10px] text-gray-600">
            Texto libre: dinero, RP, objetos, lo que sea. Solo se muestra.
          </p>
          <PrizeTableEditor rows={prizeRows} onChange={onPrizeRowsChange} />
        </>
      ) : (
        <>
          <p className="mb-3 text-[10px] text-gray-600">
            XP por puesto. Solo se muestra, no se otorga automáticamente.
          </p>
          <XpTableEditor rows={xpRows} onChange={onXpRowsChange} />
        </>
      )}
    </div>
  );
}
