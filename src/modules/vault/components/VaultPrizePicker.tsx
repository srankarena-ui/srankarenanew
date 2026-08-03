"use client"

export type PickableItem = {
  asset_id: string
  name: string
  icon_url: string
  rarity: string | null
  price_cents: number | null
  /** Puesto que gana este objeto. Nulo = premio del torneo sin posición. */
  prize_placement?: number | null
}

const RARITY_COLORS: Record<string, string> = {
  Immortal: "border-orange-400",
  Arcana: "border-red-400",
  Legendary: "border-yellow-500",
  Mythical: "border-purple-500",
}

function fmtPrice(cents: number | null) {
  return cents == null ? null : `$${(cents / 100).toFixed(2)}`
}

export function VaultPrizePicker({
  items, selected, onToggle, placements, onPlacement,
}: {
  items: PickableItem[]
  selected: Set<string>
  onToggle: (assetId: string) => void
  /** Puesto asignado a cada objeto seleccionado. Sin entrada = sin puesto. */
  placements?: Record<string, number>
  onPlacement?: (assetId: string, placement: number | null) => void
}) {
  const chosen = items.filter(i => selected.has(i.asset_id))
  const totalCents = chosen.reduce((s, i) => s + (i.price_cents ?? 0), 0)

  if (!items.length) return (
    <p className="text-[11px] text-gray-500">
      No hay items disponibles en el vault. Agrégalos desde la página del vault primero.
    </p>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-500">
          {selected.size} seleccionados
        </p>
        {selected.size > 0 && (
          <p className="text-[10px] text-green-400 font-semibold">
            Valor total: ${(totalCents / 100).toFixed(2)}
          </p>
        )}
      </div>

      {/* Puesto de cada premio elegido. Vacío = premio del torneo sin posición. */}
      {onPlacement && chosen.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-gray-800 bg-[#0f1117] p-2.5">
          <p className="text-[10px] text-gray-500">¿Qué puesto gana cada premio?</p>
          {chosen.map(item => (
            <div key={item.asset_id} className="flex items-center gap-2">
              <span className="flex-1 truncate text-[11px] text-gray-300">{item.name}</span>
              <input
                type="number"
                min={1}
                placeholder="—"
                value={placements?.[item.asset_id] ?? ""}
                onChange={e => {
                  const n = parseInt(e.target.value)
                  onPlacement(item.asset_id, Number.isFinite(n) && n > 0 ? n : null)
                }}
                aria-label={`Puesto para ${item.name}`}
                className="w-14 rounded border border-gray-800 bg-[#0b0e14] px-2 py-1 text-center text-[11px] text-gray-200 outline-hidden focus:border-[var(--color-accent)]"
              />
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
        {items.map(item => {
          const isSel = selected.has(item.asset_id)
          const border = RARITY_COLORS[item.rarity ?? ""] ?? "border-gray-700"
          const price = fmtPrice(item.price_cents)
          return (
            <button
              key={item.asset_id}
              type="button"
              onClick={() => onToggle(item.asset_id)}
              className={`relative rounded-lg border-2 bg-[#0f1117] overflow-hidden text-left transition-all ${
                isSel ? "border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]" : border + " opacity-80 hover:opacity-100"
              }`}
            >
              <div className="relative bg-[#0a0c12] flex items-center justify-center h-16">
                {/* ponytail: external Steam CDN image, no next/image */}
                <img
                  src={`https://community.cloudflare.steamstatic.com/economy/image/${item.icon_url}/128x128`}
                  alt={item.name}
                  loading="lazy"
                  className="h-full object-contain"
                />
                {price && (
                  <span className="absolute bottom-0.5 left-0.5 text-[8px] font-bold px-1 rounded bg-black/70 text-green-400">
                    {price}
                  </span>
                )}
                {isSel && (
                  <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-accent-hover)] text-[9px] text-white">
                    ✓
                  </span>
                )}
              </div>
              <p className="px-1.5 py-1 text-[9px] text-white truncate" title={item.name}>{item.name}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
