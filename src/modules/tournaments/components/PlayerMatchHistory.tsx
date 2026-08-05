"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/core/supabase/browser";

/** Lo que guarda `match_data` en summoner_trials_matches. Todo opcional: las
 *  partidas sincronizadas antes de cada cambio de fórmula no traen los campos
 *  nuevos, y una fila vieja no debe romper la tabla. */
export interface MatchRow {
  champion?: string;
  win?: boolean;
  gameDuration?: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  kda?: number;
  killParticipation?: number;
  visionScore?: number;
  cs?: number;
  csPerMin?: number;
  totalDamageDealtToChampions?: number;
  role?: string;
  performance?: number;
  feats?: Array<{ key: string; name: string; count: number; points: number }>;
  points?: { participation: number; performance: number; victory: number; feats: number; total: number };
}

const ROLE_ES: Record<string, string> = {
  TOP: "Top", JUNGLE: "Jungla", MIDDLE: "Mid", BOTTOM: "ADC", UTILITY: "Support",
};

const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0));
const mmss = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, "0")}`;

/**
 * Historial de partidas de un jugador dentro del torneo.
 *
 * Se lee desde el navegador contra Supabase: `summoner_trials_matches` tiene
 * política `for select using (true)`, así que no hace falta endpoint nuevo. Y se
 * pide solo al desplegar, no con la página: con 50 inscritos serían 500 filas de
 * jsonb en el HTML inicial de una página que ya era lenta.
 */
export function PlayerMatchHistory({ enrollmentId, columns }: { enrollmentId: string; columns: number }) {
  const [matches, setMatches] = useState<Array<{ id: string; score: number; data: MatchRow }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("summoner_trials_matches")
      .select("riot_match_id, match_score, match_data, game_creation")
      .eq("enrollment_id", enrollmentId)
      .order("game_creation", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) return setError(error.message);
        setMatches(
          (data ?? []).map((m) => ({
            id: m.riot_match_id,
            score: Number(m.match_score),
            data: m.match_data as unknown as MatchRow,
          }))
        );
      });
    return () => { cancelled = true; };
  }, [enrollmentId]);

  return (
    <tr className="border-t border-gray-800/60 bg-[#080a0f]">
      <td colSpan={columns} className="px-4 py-3">
        {error && <p className="text-xs text-red-400">No se pudieron cargar las partidas: {error}</p>}
        {!error && matches === null && <p className="text-xs text-gray-600">Cargando partidas…</p>}
        {matches?.length === 0 && (
          <p className="text-xs text-gray-600">Todavía no ha jugado ninguna partida del torneo.</p>
        )}

        {matches && matches.length > 0 && (
          <ul className="space-y-1.5">
            {matches.map((m) => (
              <MatchLine key={m.id} score={m.score} d={m.data} />
            ))}
          </ul>
        )}
      </td>
    </tr>
  );
}

function MatchLine({ d, score }: { d: MatchRow; score: number }) {
  const won = d.win === true;

  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border-l-2 px-3 py-2 ${
        won ? "border-green-500/70 bg-green-950/15" : "border-red-500/60 bg-red-950/10"
      }`}
    >
      {d.champion && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`https://cdn.communitydragon.org/latest/champion/${d.champion}/square`}
          alt=""
          className="h-8 w-8 shrink-0 rounded"
          loading="lazy"
        />
      )}

      <div className="w-24 shrink-0 leading-tight">
        <p className="text-xs font-bold text-white">{d.champion ?? "—"}</p>
        <p className="text-[9px] text-gray-500">
          {d.role ? (ROLE_ES[d.role] ?? d.role) : "—"}
          {d.gameDuration ? ` · ${mmss(d.gameDuration)}` : ""}
        </p>
      </div>

      <Stat label="KDA" value={`${d.kills ?? "—"}/${d.deaths ?? "—"}/${d.assists ?? "—"}`}
            sub={d.kda != null ? `${d.kda.toFixed(2)}` : undefined} />
      <Stat label="KP" value={d.killParticipation != null ? `${d.killParticipation.toFixed(0)}%` : "—"} />
      <Stat label="CS" value={d.cs != null ? `${d.cs}` : "—"}
            sub={d.csPerMin != null ? `${d.csPerMin.toFixed(1)}/min` : undefined} />
      <Stat label="Daño" value={d.totalDamageDealtToChampions != null ? fmtK(d.totalDamageDealtToChampions) : "—"} />
      <Stat label="Visión" value={d.visionScore != null ? `${d.visionScore}` : "—"} />
      <Stat label="Rendim." value={d.performance != null ? d.performance.toFixed(0) : "—"} />

      {/* Los retos de esa partida, que son la parte menos obvia de la puntuación */}
      {(d.feats?.length ?? 0) > 0 && (
        <span className="text-[9px] text-gray-500">
          {d.feats!.map((f) => `${f.name}${f.count > 1 ? ` ×${f.count}` : ""}`).join(" · ")}
        </span>
      )}

      <span className="ml-auto shrink-0 text-right">
        <span className={`text-sm font-bold ${score >= 0 ? "text-[var(--color-accent)]" : "text-red-400"}`}>
          {score >= 0 ? "+" : ""}{score.toFixed(0)}
        </span>
        <span className="block text-[9px] text-gray-600">{won ? "Victoria" : "Derrota"}</span>
      </span>
    </li>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="leading-tight">
      <p className="text-[9px] uppercase text-gray-600">{label}</p>
      <p className="text-xs text-gray-200">
        {value}
        {sub && <span className="ml-1 text-[9px] text-gray-500">{sub}</span>}
      </p>
    </div>
  );
}
