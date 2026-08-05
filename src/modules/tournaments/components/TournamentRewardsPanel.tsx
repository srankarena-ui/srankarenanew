"use client";

import { useState } from "react";
import { placementLabel, medalFor, type PrizeRow } from "@/core/lib/prize-table";
import type { XpRow } from "@/core/lib/xp-table";
import { FEATS, featsForRole, type Role } from "@/core/lib/tournament-feats";
import type { PickableItem } from "@/modules/vault/components/VaultPrizePicker";

type Tab = "premios" | "exp" | "puntos";

const ROLES: Array<[Role, string]> = [
  ["TOP", "Top"],
  ["JUNGLE", "Jungla"],
  ["MIDDLE", "Mid"],
  ["BOTTOM", "ADC"],
  ["UTILITY", "Support"],
];

/**
 * Todo lo que se puede ganar, en una sola tarjeta con pestañas: los premios por
 * puesto, la XP por puesto, y de dónde salen los puntos. Antes la explicación
 * de los puntos vivía al final de la clasificación, donde nadie la leía.
 */
export function TournamentRewardsPanel({
  prizeRows,
  prizeItems,
  xpRows,
  showPoints,
}: {
  prizeRows: PrizeRow[];
  prizeItems: PickableItem[];
  xpRows: XpRow[];
  /** Solo Summoner Trials puntúa por partida; en bracket no aplica. */
  showPoints: boolean;
}) {
  const tabs: Array<[Tab, string]> = [];
  if (prizeRows.length > 0 || prizeItems.length > 0) tabs.push(["premios", "Premios"]);
  if (xpRows.length > 0) tabs.push(["exp", "Premios EXP"]);
  if (showPoints) tabs.push(["puntos", "Puntos"]);

  const [tab, setTab] = useState<Tab>(tabs[0]?.[0] ?? "premios");
  if (!tabs.length) return null;

  const active = tabs.some(([k]) => k === tab) ? tab : tabs[0][0];

  return (
    <div className="mt-4 rounded-2xl border border-gray-800/60 bg-[#121620]">
      {tabs.length > 1 && (
        <div className="flex border-b border-gray-800/60">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 px-2 py-2.5 text-[9px] transition-colors ${
                active === key
                  ? "border-b-2 border-[var(--color-accent)] text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="p-5">
        {tabs.length === 1 && (
          <h3 className="mb-3 text-[10px] text-gray-400">{tabs[0][1]}</h3>
        )}

        {active === "premios" && (
          <ul className="divide-y divide-gray-800/60">
            {/* Un rango como 3º-4º significa que esas posiciones ganan lo mismo. */}
            {prizeRows.map((row) => (
              <PlacementRow key={`p${row.from}-${row.to}`} row={row}>
                <span className="text-sm text-white">{row.prize}</span>
              </PlacementRow>
            ))}

            {[...prizeItems]
              .sort((a, b) => (a.prize_placement ?? 99) - (b.prize_placement ?? 99))
              .map((item) => (
                <PlacementRow
                  key={item.asset_id}
                  row={item.prize_placement ? { from: item.prize_placement, to: item.prize_placement } : null}
                >
                  {/* ponytail: imagen del CDN de Steam, sin next/image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://community.cloudflare.steamstatic.com/economy/image/${item.icon_url}/64x64`}
                    alt=""
                    className="h-7 w-7 shrink-0 rounded"
                  />
                  <span className="text-xs text-white">{item.name}</span>
                </PlacementRow>
              ))}
          </ul>
        )}

        {active === "exp" && (
          <ul className="divide-y divide-gray-800/60">
            {xpRows.map((row) => (
              <PlacementRow key={`x${row.from}-${row.to}`} row={row}>
                <span className="text-sm text-white">
                  {row.xp.toLocaleString("es-ES")}
                  <span className="ml-1 text-[10px] text-gray-500">EXP</span>
                </span>
              </PlacementRow>
            ))}
          </ul>
        )}

        {active === "puntos" && <PointsTab />}
      </div>
    </div>
  );
}

/**
 * Una fila de premio: el puesto siempre a la izquierda con ancho fijo, para que
 * las medallas y los rangos queden en columna y no bailen unos respecto a otros.
 */
function PlacementRow({
  row,
  children,
}: {
  row: { from: number; to: number } | null;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="flex w-14 shrink-0 items-center gap-1">
        {row && medalFor(row) && <span className="text-sm leading-none">{medalFor(row)}</span>}
        <span className="text-[11px] font-bold text-[var(--color-accent)]">
          {row ? placementLabel(row) : "—"}
        </span>
      </span>
      {children}
    </li>
  );
}

function PointsTab() {
  const [role, setRole] = useState<Role>("TOP");
  const [open, setOpen] = useState<string | null>(null);

  const common = FEATS.filter((f) => f.scope === "equipo" || f.scope === "individual");
  const signature = featsForRole(role).filter((f) => f.scope === role);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-[9px] text-gray-500">POR PARTIDA</h4>
        <dl className="space-y-1 text-xs">
          {[
            ["Participar", "+10", ""],
            ["Rendimiento", "0 – 100", ""],
            ["Victoria", "+30", ""],
            ["Derrota", "−20", "text-red-400"],
          ].map(([label, value, color]) => (
            <div key={label} className="flex justify-between gap-2">
              <dt className="text-gray-400">{label}</dt>
              <dd className={`font-bold ${color || "text-[var(--color-accent)]"}`}>{value}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-2 border-t border-gray-800/60 pt-1">
            <dt className="text-gray-400">Balance negativo</dt>
            <dd className="font-bold text-red-400">−25</dd>
          </div>
        </dl>
        <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
          El rendimiento es tu percentil dentro de tu rol, así que un support y un
          ADC se miden con la misma vara. El balance negativo resta 25 por cada
          derrota que exceda a tus victorias.
        </p>
      </div>

      <div>
        <h4 className="mb-2 text-[9px] text-gray-500">
          RETOS · {common.length + signature.length} POR PARTIDA
        </h4>

        <div className="mb-2 flex flex-wrap gap-1">
          {ROLES.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setRole(key)}
              className={`rounded px-2 py-1 text-[9px] transition-colors ${
                role === key
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[#0b0e14] text-gray-500 hover:text-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ponytail: se despliega uno a la vez y en su sitio, en vez de un
            tooltip flotante — la tarjeta es estrecha y así funciona en móvil. */}
        <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
          {[...signature, ...common]
            .sort((a, b) => b.points - a.points)
            .map((feat) => (
              <li key={feat.key}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-gray-300">
                    {feat.name}
                    <button
                      type="button"
                      onClick={() => setOpen(open === feat.key ? null : feat.key)}
                      aria-expanded={open === feat.key}
                      aria-label={`Qué es ${feat.name}`}
                      className={`ml-1.5 h-4 w-4 rounded-full border text-[9px] leading-none transition-colors ${
                        open === feat.key
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                          : "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300"
                      }`}
                    >
                      ?
                    </button>
                    {feat.scope === role && (
                      <span className="ml-1 text-[9px] text-[var(--color-accent)]">tu rol</span>
                    )}
                  </span>
                  <span className="shrink-0 font-bold text-[var(--color-accent)]">+{feat.points}</span>
                </div>
                {open === feat.key && (
                  <p className="mt-1 mb-1.5 rounded-lg bg-[#0b0e14] px-2.5 py-2 text-[10px] leading-relaxed text-gray-400">
                    {feat.how}
                    <span className="mt-1 block text-gray-600">
                      Lo consigue el {feat.rate.toFixed(1)}% de las partidas.
                    </span>
                  </p>
                )}
              </li>
            ))}
        </ul>
        <p className="mt-2 text-[10px] leading-relaxed text-gray-500">
          Cuanto más raro es un reto, más paga. Los dos de tu rol valen 5 puntos
          fijos, iguales en los cinco puestos.
        </p>
      </div>
    </div>
  );
}
