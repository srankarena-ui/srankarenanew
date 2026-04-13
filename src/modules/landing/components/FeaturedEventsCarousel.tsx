"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { Tournament } from "@/core/types";

const FORMAT_COLORS: Record<string, string> = {
  single_elimination: "bg-blue-500/20 text-blue-300",
  double_elimination: "bg-cyan-500/20 text-cyan-300",
  summoner_trials: "bg-yellow-500/20 text-yellow-300",
};

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "Single Elim",
  double_elimination: "Double Elim",
  summoner_trials: "Summoner Trials",
};

interface FeaturedEventsCarouselProps {
  tournaments: Tournament[];
  autoPlayMs?: number;
}

function TournamentCard({
  tournament,
  locale,
  position, // "center" | "left" | "right"
  onClick,
}: {
  tournament: Tournament;
  locale: string;
  position: "center" | "left" | "right";
  onClick?: () => void;
}) {
  const t = useTranslations("landing");
  const isCenter = position === "center";

  return (
    <div
      onClick={!isCenter ? onClick : undefined}
      className={`relative flex-shrink-0 overflow-hidden rounded-2xl border transition-all duration-500 select-none
        ${isCenter
          ? "w-[52%] border-purple-500/30 shadow-2xl shadow-purple-900/20 z-10 cursor-default"
          : "w-[24%] border-gray-800/40 opacity-40 scale-90 z-0 cursor-pointer hover:opacity-55 hover:scale-95"
        }
      `}
    >
      {/* Banner */}
      <div className="relative aspect-[2/1] w-full overflow-hidden">
        {tournament.banner_url ? (
          <img
            src={tournament.banner_url}
            alt={tournament.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-900/40 to-[#0d1017]">
            <span className="text-2xl font-black uppercase italic tracking-tighter text-purple-400/30">
              {tournament.game}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1017] via-black/20 to-transparent" />

        {/* Format badge — center only */}
        {isCenter && tournament.tournament_format && (
          <span className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${FORMAT_COLORS[tournament.tournament_format] ?? "bg-gray-500/20 text-gray-400"}`}>
            {FORMAT_LABELS[tournament.tournament_format] ?? tournament.tournament_format}
          </span>
        )}
      </div>

      {/* Info — center only */}
      {isCenter && (
        <div className="bg-[#0d1017] px-5 pb-5 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-black uppercase italic tracking-tighter text-white">
                {tournament.title}
              </h3>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                {tournament.game}
                {tournament.start_date && (
                  <> · {new Date(tournament.start_date).toLocaleDateString(locale === "es" ? "es-CL" : "en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                )}
              </p>
              {tournament.reward_points > 0 && (
                <p className="mt-1 text-xs font-bold text-purple-400">+{tournament.reward_points} EXP</p>
              )}
            </div>
            <Link
              href={`/${locale}/tournaments/${tournament.id}`}
              className="shrink-0 rounded-xl bg-purple-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-purple-500"
            >
              {t("featuredViewCta")} →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function FeaturedEventsCarousel({ tournaments, autoPlayMs = 5000 }: FeaturedEventsCarouselProps) {
  const locale = useLocale();
  const t = useTranslations("landing");
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const prev = useCallback(() => setCurrent((c) => (c - 1 + tournaments.length) % tournaments.length), [tournaments.length]);
  const next = useCallback(() => setCurrent((c) => (c + 1) % tournaments.length), [tournaments.length]);

  useEffect(() => {
    if (paused || tournaments.length <= 1) return;
    const id = setInterval(next, autoPlayMs);
    return () => clearInterval(id);
  }, [paused, next, autoPlayMs, tournaments.length]);

  if (tournaments.length === 0) return null;

  const len = tournaments.length;
  const leftIdx = (current - 1 + len) % len;
  const rightIdx = (current + 1) % len;

  return (
    <section className="py-24">
      <h2 className="mb-10 text-center text-3xl font-black uppercase italic tracking-tighter text-white">
        {t("featuredEventsTitle")}
      </h2>

      <div
        className="relative flex items-center justify-center gap-0 overflow-hidden px-4"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Left card */}
        {len > 1 && (
          <TournamentCard
            tournament={tournaments[leftIdx]}
            locale={locale}
            position="left"
            onClick={prev}
          />
        )}

        {/* Center card */}
        <TournamentCard
          tournament={tournaments[current]}
          locale={locale}
          position="center"
        />

        {/* Right card */}
        {len > 1 && (
          <TournamentCard
            tournament={tournaments[rightIdx]}
            locale={locale}
            position="right"
            onClick={next}
          />
        )}
      </div>

      {/* Dot indicators */}
      {len > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {tournaments.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-6 bg-purple-500" : "w-1.5 bg-gray-700 hover:bg-gray-500"}`}
              aria-label={t("featuredGoToSlide", { index: i + 1 })}
            />
          ))}
        </div>
      )}
    </section>
  );
}
