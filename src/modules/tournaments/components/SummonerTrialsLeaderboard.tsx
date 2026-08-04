"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useToast } from "@/core/ui/Toast";
import type { TrialsEnrollmentWithProfile, TrialsConfig } from "@/core/types";
import { SCORING_WEIGHTS } from "@/core/lib/role-score";
import { placementLabel, medalFor } from "@/core/lib/prize-table";
import type { XpRow } from "@/core/lib/xp-table";

interface StatsSnapshot {
  avg_kda: number;
  avg_kill_participation: number;
  avg_vision_score: number;
  avg_cs_per_min: number;
  avg_damage: number;
  avg_wards_placed: number;
  avg_objectives: number;
  wins: number;
  losses: number;
  // Desglose de la puntuación por rol. Opcionales: las inscripciones
  // sincronizadas antes del cambio de fórmula no los tienen.
  role?: string;
  avg_performance?: number;
  performance_points?: number;
  participation_points?: number;
  victory_points?: number;
  feat_points?: number;
  feats_earned?: Array<{ name: string; count: number; points: number }>;
  deficit?: number;
  deficit_penalty?: number;
}

const ROLE_ES: Record<string, string> = {
  TOP: "Superior", JUNGLE: "Jungla", MIDDLE: "Central", BOTTOM: "Tirador", UTILITY: "Soporte",
};

interface Props {
  tournamentId: string;
  enrollments: TrialsEnrollmentWithProfile[];
  config: TrialsConfig;
  xpTable: XpRow[];
  isAdmin: boolean;
  currentUserId: string | null;
}

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0);
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function SummonerTrialsLeaderboard({
  tournamentId,
  enrollments,
  config,
  xpTable,
  isAdmin,
  currentUserId,
}: Props) {
  const t = useTranslations("tournaments");
  const router = useRouter();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const sorted = [...enrollments].sort((a, b) => b.score - a.score);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/lol/trials/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId }),
      });
      const data = await res.json() as { synced: number; errors?: string[]; error?: string };
      if (data.error) {
        toast(data.error, "error");
      } else {
        toast(t("syncedMatches", { count: data.synced }), "success");
        router.refresh();
      }
    } catch {
      toast(t("syncFailed"), "error");
    }
    setSyncing(false);
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500">
            {t("trackingSummary", { matches: config.matches_to_track, players: sorted.length })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* XP por puesto — respeta rangos (3º-4º), no asume posiciones sueltas. */}
          {xpTable.length > 0 && (
            <div className="flex items-center gap-1 rounded-lg border border-purple-800/40 bg-purple-900/20 px-3 py-1.5">
              <span className="text-[9px] font-bold text-[var(--color-accent)] mr-1">{t("rewards")}</span>
              {xpTable.slice(0, 5).map((row) => (
                <span key={`${row.from}-${row.to}`} className="text-[10px] font-bold text-white px-1">
                  {medalFor(row) ?? placementLabel(row)} {row.xp}
                </span>
              ))}
              <span className="text-[9px] text-gray-500 ml-1">EXP</span>
            </div>
          )}

          {isAdmin && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-xl bg-[var(--color-accent)] px-4 py-2 text-[10px] text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
              {syncing ? t("syncingStats") : `⟳ ${t("syncStats")}`}
            </button>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-[#121620] p-8 text-center text-sm text-gray-500">
          {t("noPlayersEnrolled")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-[#0d1017] text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
                <th className="px-4 py-3 text-left w-10">#</th>
                <th className="px-4 py-3 text-left">{t("playerColumn")}</th>
                <th className="px-4 py-3 text-left">Rol</th>
                <th className="px-4 py-3 text-right">{t("score")}</th>
                <th className="px-4 py-3 text-right">Rendim.</th>
                <th className="px-4 py-3 text-right">Retos</th>
                <th className="px-4 py-3 text-center">{t("matchesColumn")}</th>
                <th className="px-4 py-3 text-right">{t("avgKda")}</th>
                <th className="px-4 py-3 text-right">KP%</th>
                <th className="px-4 py-3 text-right">{t("vision")}</th>
                <th className="px-4 py-3 text-right">CS/min</th>
                <th className="px-4 py-3 text-right">{t("damage")}</th>
                <th className="px-4 py-3 text-right">{t("wl")}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((enrollment, idx) => {
                const rank = idx + 1;
                const snap = enrollment.stats_snapshot as StatsSnapshot | null;
                const isCurrentUser = enrollment.user_id === currentUserId;
                const progress = enrollment.matches_tracked;
                const total = config.matches_to_track;
                const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

                return (
                  <tr
                    key={enrollment.id}
                    className={`border-t border-gray-800/60 transition-colors ${
                      isCurrentUser
                        ? "bg-purple-900/10"
                        : rank % 2 === 0
                          ? "bg-[#0f1117]"
                          : "bg-[#0b0e14]"
                    }`}
                  >
                    {/* Rank */}
                    <td className="px-4 py-3 text-center">
                      {MEDAL[rank] ? (
                        <span className="text-base">{MEDAL[rank]}</span>
                      ) : (
                        <span className="text-xs font-bold text-gray-500">{rank}</span>
                      )}
                    </td>

                    {/* Player */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-700 to-gray-800 shrink-0 flex items-center justify-center text-[9px] text-purple-200">
                          {(enrollment.profile.username ?? "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${isCurrentUser ? "text-purple-300" : "text-white"}`}>
                            {enrollment.profile.username ?? t("unknownPlayer")}
                            {isCurrentUser && <span className="ml-1.5 text-[9px] text-purple-500">({t("you")})</span>}
                          </p>
                          <p className="text-[9px] text-gray-600">{enrollment.region.toUpperCase()}</p>
                        </div>
                      </div>
                    </td>

                    {/* Rol: la puntuación se calcula comparando contra este rol,
                        así que sin verlo el número no se puede interpretar. */}
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {snap?.role ? ROLE_ES[snap.role] ?? snap.role : "—"}
                      </span>
                    </td>

                    {/* Score */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-white">{enrollment.score.toFixed(0)}</span>
                      <span className="ml-0.5 text-[9px] text-gray-600"> {t("pointsShort")}</span>
                      {/* Balance negativo: se avisa para que no parezca un error */}
                      {(snap?.deficit_penalty ?? 0) > 0 && (
                        <span
                          className="block text-[9px] text-red-400"
                          title={`${snap!.deficit} derrotas mas que victorias`}
                        >
                          −{snap!.deficit_penalty} balance
                        </span>
                      )}
                    </td>

                    {/* Rendimiento: percentil medio dentro de su rol */}
                    <td className="px-4 py-3 text-right text-xs text-gray-300">
                      {snap?.avg_performance != null ? snap.avg_performance.toFixed(0) : "—"}
                    </td>

                    {/* Retos conseguidos */}
                    <td className="px-4 py-3 text-right">
                      {snap?.feat_points != null ? (
                        <span
                          className="text-xs text-gray-300"
                          title={(snap.feats_earned ?? [])
                            .map((f) => `${f.name}${f.count > 1 ? ` ×${f.count}` : ""} +${f.points}`)
                            .join("\n")}
                        >
                          {snap.feat_points}
                          {(snap.feats_earned?.length ?? 0) > 0 && (
                            <span className="ml-1 text-[9px] text-gray-600">
                              ({snap.feats_earned!.length})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>

                    {/* Matches progress */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-gray-300">
                          {progress}/{total}
                        </span>
                        <div className="w-16 h-1.5 rounded-full bg-gray-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct >= 100 ? "bg-green-500" : "bg-[var(--color-accent-hover)]"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Stats (from snapshot) */}
                    <td className="px-4 py-3 text-right text-xs text-gray-300">
                      {snap ? snap.avg_kda.toFixed(2) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-300">
                      {snap ? `${snap.avg_kill_participation.toFixed(0)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-300">
                      {snap ? snap.avg_vision_score.toFixed(0) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-300">
                      {snap ? snap.avg_cs_per_min.toFixed(1) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-300">
                      {snap ? fmtK(snap.avg_damage) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      {snap ? (
                        <>
                          <span className="text-green-400">{snap.wins}W</span>
                          <span className="text-gray-600 mx-0.5">–</span>
                          <span className="text-red-400">{snap.losses}L</span>
                        </>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Scoring weights info (collapsible) */}
      <ScoringWeightsInfo config={config} />
    </div>
  );
}

function ScoringWeightsInfo({ config }: { config: TrialsConfig }) {
  const t = useTranslations("tournaments");
  const [open, setOpen] = useState(false);
  // Los pesos son fijos del sistema, no del torneo: los de trials_config solo
  // sobreviven en eventos antiguos y ya no se usan para puntuar.
  const w = SCORING_WEIGHTS;

  // Cada partida suma cuatro cosas. El rendimiento no puntúa valores crudos:
  // mide en qué percentil de TU ROL caes, así una partida de soporte y una de
  // tirador valen lo mismo aunque sus números no se parezcan en nada.
  const entries = [
    {
      label: "Participación",
      formula: "+10",
      example: "por terminar la partida",
    },
    {
      label: "Rendimiento",
      formula: "0 – 100",
      example: `percentil de tu rol · pesos: KDA ×${w.kda}, participación ×${w.kill_participation}, visión ×${w.vision_score}, daño ×${w.damage}, CS ×${w.cs_per_min}`,
    },
    {
      label: "Resultado",
      formula: "+30 / −20",
      example: "ganar suma, perder resta",
    },
    {
      label: "Retos",
      formula: "3 – 100 cada uno",
      example: "20 retos por partida: 18 iguales para todos y 2 propios de tu rol. Cuanto más raro, más paga",
    },
    {
      label: "Balance",
      formula: "−25",
      example: "por cada derrota que exceda a tus victorias, al final del torneo",
    },
  ];

  return (
    <div className="rounded-xl border border-gray-800/60 bg-[#121620]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-[9px] font-bold text-gray-500 hover:text-gray-400 transition-colors"
      >
        <span>{t("scoringFormula")}</span>
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="border-t border-gray-800/60 px-4 py-3">
          <p className="text-[10px] text-gray-500 mb-3">
            {t("scoringFormulaDescription")}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {entries.map((e) => (
              <div key={e.label} className="rounded-lg bg-[#0b0e14] p-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-accent)]">{e.label}</p>
                <p className="text-[10px] text-gray-300 font-mono mt-0.5">{e.formula}</p>
                <p className="text-[9px] text-gray-600 mt-0.5">{e.example}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
