"use client";

import { Badge } from "@/core/ui/Badge";
import { DefaultBanner } from "@/core/ui/DefaultBanner";
import { useTranslations, useLocale } from "next-intl";
import type { TournamentWithParticipants } from "@/core/types";

interface TournamentCardProps {
  tournament: TournamentWithParticipants;
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  draft: { label: "status_draft", color: "bg-[var(--color-border)]" },
  registration: { label: "status_registration", color: "bg-[var(--color-accent)]" },
  active: { label: "status_active", color: "bg-[var(--color-danger)]" },
  completed: { label: "status_completed", color: "bg-[var(--color-border)]" },
  cancelled: { label: "status_cancelled", color: "bg-[var(--color-danger)]/80" },
};

const FORMAT_BADGE: Record<string, string> = {
  single_elimination: "bg-blue-600/80",
  double_elimination: "bg-cyan-600/80",
  summoner_trials: "bg-yellow-500/90",
};

export function TournamentCard({ tournament }: TournamentCardProps) {
  const t = useTranslations("tournaments");
  const locale = useLocale();

  const dateObj = tournament.start_date ? new Date(tournament.start_date) : null;
  const formattedDate = dateObj
    ? dateObj.toLocaleDateString(locale === "es" ? "es-ES" : "en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : null;
  const formattedTime = tournament.start_time
    ? tournament.start_time.slice(0, 5)
    : null;

  const statusInfo = STATUS_BADGE[tournament.status] || STATUS_BADGE.draft;

  return (
    <a
      href={`/${locale}/tournaments/${tournament.id}`}
      className="group block"
    >
      <div className="overflow-hidden rounded-2xl border border-gray-800/60 bg-[#121620] transition-all duration-300 hover:border-[var(--color-accent)]/40 hover:shadow-[0_0_30px_rgba(168,85,247,0.08)]">
        {/* Banner (2:1 aspect) */}
        <div className="relative aspect-[2/1] w-full overflow-hidden">
          {tournament.banner_url ? (
            <img
              src={tournament.banner_url}
              alt={tournament.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <DefaultBanner className="h-full w-full" />
          )}
          {/* Mode badge */}
          {tournament.mode && (
            <span className="absolute left-3 top-3 rounded-md bg-green-500 px-2 py-0.5 text-[9px] uppercase tracking-wider text-white">
              {tournament.mode}
            </span>
          )}
          {/* Format badge */}
          {tournament.tournament_format && (
            <span className={`absolute right-3 top-3 rounded-md px-2 py-0.5 text-[9px] uppercase tracking-wider text-white ${FORMAT_BADGE[tournament.tournament_format] ?? "bg-gray-600/80"}`}>
              {t(`format_${tournament.tournament_format}` as Parameters<typeof t>[0])}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="text-base text-white">
            {tournament.title}
          </h3>

          {/* Date + Time + Status */}
          <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
            {formattedDate && (
              <span className="flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                {formattedDate}
              </span>
            )}
            {formattedTime && (
              <span className="flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                {formattedTime}
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-[8px] uppercase tracking-wider text-white ${statusInfo.color}`}>
              {t(statusInfo.label as Parameters<typeof t>[0])}
            </span>
          </div>

          {/* Region + Reward row */}
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <span className="text-gray-500">
              {tournament.region || "—"}
            </span>
            {tournament.reward_points > 0 && (
              <span className="flex items-center gap-1 font-bold text-[var(--color-accent)]">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 15l-2 5h4l-2-5z" />
                  <circle cx="12" cy="9" r="5" />
                </svg>
                +{tournament.reward_points} EXP
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="my-3 border-t border-gray-800/60" />

          {/* Footer: Game + View Details */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
              <svg className="h-3 w-3 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {tournament.game}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 transition-colors group-hover:text-[var(--color-accent)]">
              {t("viewDetails")} →
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
