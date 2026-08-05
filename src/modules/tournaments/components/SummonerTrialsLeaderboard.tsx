"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { PlayerMatchHistory } from "./PlayerMatchHistory";
import { useTranslations } from "next-intl";
import { useToast } from "@/core/ui/Toast";
import type { TrialsEnrollmentWithProfile, TrialsConfig } from "@/core/types";

// Todo es opcional a propósito: el snapshot se escribe en dos momentos y con
// distinto contenido — el rango en cuanto el jugador se inscribe, las medias
// solo cuando tiene partidas. Declarar las medias como obligatorias hacía que
// el compilador bendijera `snap.avg_kda.toFixed()`, que revienta en runtime
// para quien todavía no ha jugado.
interface StatsSnapshot {
  avg_kda?: number;
  avg_kill_participation?: number;
  avg_vision_score?: number;
  avg_cs_per_min?: number;
  avg_damage?: number;
  avg_wards_placed?: number;
  avg_objectives?: number;
  wins?: number;
  losses?: number;
  // Desglose de la puntuación por rol. Opcionales: las inscripciones
  // sincronizadas antes del cambio de fórmula no los tienen.
  role?: string;
  rank_tier?: string | null;
  rank_division?: string | null;
  rank_lp?: number | null;
  avg_performance?: number;
  performance_points?: number;
  participation_points?: number;
  victory_points?: number;
  feat_points?: number;
  feats_earned?: Array<{ name: string; count: number; points: number }>;
  deficit?: number;
  deficit_penalty?: number;
}

const TIER_ES: Record<string, string> = {
  IRON: "Hierro", BRONZE: "Bronce", SILVER: "Plata", GOLD: "Oro", PLATINUM: "Platino",
  EMERALD: "Esmeralda", DIAMOND: "Diamante", MASTER: "Maestro",
  GRANDMASTER: "Gran maestro", CHALLENGER: "Retador",
};

/** Maestro y por encima son ligas únicas: Riot manda "I" pero no se muestra. */
const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

/**
 * Emblema del rango. Data Dragon no sirve los emblemas de liga — solo iconos de
 * invocador y campeones —, así que salen de CommunityDragon, que los extrae del
 * cliente. `latest` sigue el parche vivo sin que haya que fijar versión.
 */
function rankCrest(tier: string): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${tier.toLowerCase()}.svg`;
}

function RankCell({ snap }: { snap: StatsSnapshot | null }) {
  const tier = snap?.rank_tier;
  if (!tier) {
    return <span className="text-[10px] text-gray-600">Sin clasificar</span>;
  }
  const division = APEX_TIERS.has(tier) ? "" : (snap?.rank_division ?? "");
  return (
    <div className="flex items-center gap-2">
      {/* ponytail: emblema del CDN, sin next/image ni dominio que configurar */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={rankCrest(tier)} alt="" className="h-5 w-5 shrink-0" loading="lazy" />
      <div className="leading-tight">
        <p className="text-[11px] font-bold text-white">
          {TIER_ES[tier] ?? tier} {division}
        </p>
        {snap?.rank_lp != null && (
          <p className="text-[9px] text-gray-600">{snap.rank_lp} LP</p>
        )}
      </div>
    </div>
  );
}

interface Props {
  tournamentId: string;
  enrollments: TrialsEnrollmentWithProfile[];
  config: TrialsConfig;
  isAdmin: boolean;
  currentUserId: string | null;
}

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0);
}

/** Un snapshot puede traer solo el rango: nunca dar por hecho que hay medias. */
const num = (v: number | undefined, decimals: number) =>
  v != null ? v.toFixed(decimals) : "—";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

/** Columnas de la tabla — el desplegable las tiene que abarcar todas. */
const COLUMNS = 13;

export function SummonerTrialsLeaderboard({
  tournamentId,
  enrollments,
  config,
  isAdmin,
  currentUserId,
}: Props) {
  const t = useTranslations("tournaments");
  const router = useRouter();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  // Solo uno abierto a la vez: con varios, la tabla se vuelve ilegible.
  const [expanded, setExpanded] = useState<string | null>(null);

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
      } else if (data.errors?.length) {
        // El sync sigue adelante aunque falle una parte (p. ej. el rango). Sin
        // esto, "no se ve el rango" no daba ninguna pista de por qué.
        toast(`${data.synced} sincronizadas · ${data.errors[0]}`, "error");
        router.refresh();
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
          {/* La XP por puesto y el catálogo de retos viven ahora en la tarjeta
              lateral de premios, con pestañas. */}
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
              <tr className="bg-[#0d1017] text-[9px] font-bold uppercase tracking-[0.1em] text-gray-500">
                <th className="px-2.5 py-2 text-left w-10">#</th>
                <th className="px-2.5 py-2 text-left">{t("playerColumn")}</th>
                <th className="px-2.5 py-2 text-left">Rango</th>
                <th className="px-2.5 py-2 text-right">{t("score")}</th>
                <th className="px-2.5 py-2 text-right">Rendim.</th>
                <th className="px-2.5 py-2 text-right">Retos</th>
                <th className="px-2.5 py-2 text-center">{t("matchesColumn")}</th>
                <th className="px-2.5 py-2 text-right">{t("avgKda")}</th>
                <th className="px-2.5 py-2 text-right">KP%</th>
                <th className="px-2.5 py-2 text-right">{t("vision")}</th>
                <th className="px-2.5 py-2 text-right">CS/min</th>
                <th className="px-2.5 py-2 text-right">{t("damage")}</th>
                <th className="px-2.5 py-2 text-right">{t("wl")}</th>
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

                const isOpen = expanded === enrollment.id;

                return (
                  <Fragment key={enrollment.id}>
                  <tr
                    onClick={() => setExpanded(isOpen ? null : enrollment.id)}
                    className={`cursor-pointer border-t border-gray-800/60 transition-colors hover:bg-purple-900/20 ${
                      isOpen
                        ? "bg-purple-900/20"
                        : isCurrentUser
                          ? "bg-purple-900/10"
                          : rank % 2 === 0
                            ? "bg-[#0f1117]"
                            : "bg-[#0b0e14]"
                    }`}
                  >
                    {/* Rank */}
                    <td className="px-2.5 py-2 text-center">
                      {MEDAL[rank] ? (
                        <span className="text-sm">{MEDAL[rank]}</span>
                      ) : (
                        <span className="text-xs font-bold text-gray-500">{rank}</span>
                      )}
                    </td>

                    {/* Player */}
                    <td className="px-2.5 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-700 to-gray-800 shrink-0 flex items-center justify-center text-[9px] text-purple-200">
                          {(enrollment.profile.username ?? "?")[0].toUpperCase()}
                        </div>
                        <div className="leading-tight">
                          <p className={`text-xs font-bold ${isCurrentUser ? "text-purple-300" : "text-white"}`}>
                            <span className={`mr-1 inline-block text-[9px] text-gray-500 transition-transform ${isOpen ? "rotate-90" : ""}`}>
                              ▶
                            </span>
                            {enrollment.profile.username ?? t("unknownPlayer")}
                            {isCurrentUser && <span className="ml-1 text-[9px] text-purple-500">({t("you")})</span>}
                          </p>
                          <p className="pl-3.5 text-[9px] text-gray-600">{enrollment.region.toUpperCase()}</p>
                        </div>
                      </div>
                    </td>

                    {/* Rango de solo/dúo. Antes iba el rol, pero en diez
                        partidas alguien puede jugar tres posiciones y el dato
                        no dice nada; el rango sí sitúa al jugador. */}
                    <td className="px-2.5 py-2">
                      <RankCell snap={snap} />
                    </td>

                    {/* Score */}
                    <td className="px-2.5 py-2 text-right">
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
                    <td className="px-2.5 py-2 text-right text-xs text-gray-300">
                      {snap?.avg_performance != null ? snap.avg_performance.toFixed(0) : "—"}
                    </td>

                    {/* Retos conseguidos */}
                    <td className="px-2.5 py-2 text-right">
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
                    <td className="px-2.5 py-2">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] font-bold text-gray-300">
                          {progress}/{total}
                        </span>
                        <div className="w-12 h-1 rounded-full bg-gray-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct >= 100 ? "bg-green-500" : "bg-[var(--color-accent-hover)]"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Stats del snapshot. Se comprueba campo a campo, no
                        `snap ?`: un jugador con rango pero sin partidas tiene
                        snapshot con solo el rango dentro. */}
                    <td className="px-2.5 py-2 text-right text-xs text-gray-300">
                      {num(snap?.avg_kda, 2)}
                    </td>
                    <td className="px-2.5 py-2 text-right text-xs text-gray-300">
                      {snap?.avg_kill_participation != null ? `${snap.avg_kill_participation.toFixed(0)}%` : "—"}
                    </td>
                    <td className="px-2.5 py-2 text-right text-xs text-gray-300">
                      {num(snap?.avg_vision_score, 0)}
                    </td>
                    <td className="px-2.5 py-2 text-right text-xs text-gray-300">
                      {num(snap?.avg_cs_per_min, 1)}
                    </td>
                    <td className="px-2.5 py-2 text-right text-xs text-gray-300">
                      {snap?.avg_damage != null ? fmtK(snap.avg_damage) : "—"}
                    </td>
                    <td className="px-2.5 py-2 text-right text-xs">
                      {snap?.wins != null ? (
                        <>
                          <span className="text-green-400">{snap.wins}W</span>
                          <span className="text-gray-600 mx-0.5">–</span>
                          <span className="text-red-400">{snap.losses ?? 0}L</span>
                        </>
                      ) : "—"}
                    </td>
                  </tr>

                  {isOpen && <PlayerMatchHistory enrollmentId={enrollment.id} columns={COLUMNS} />}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
