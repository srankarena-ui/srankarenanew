"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { TournamentCard } from "./TournamentCard";
import type { TournamentWithParticipants, TournamentStatus } from "@/core/types";

interface TournamentListProps {
  tournaments: TournamentWithParticipants[];
}

const STATUS_FILTERS: { key: TournamentStatus | "all"; labelKey: string }[] = [
  { key: "all", labelKey: "filterAll" },
  { key: "active", labelKey: "filterActive" },
  { key: "registration", labelKey: "filterUpcoming" },
  { key: "completed", labelKey: "filterCompleted" },
];

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "Single Elim",
  double_elimination: "Double Elim",
  summoner_trials: "Summoner Trials",
};

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 pr-10 text-[11px] font-black uppercase tracking-[0.15em] text-gray-200 outline-hidden transition-colors hover:border-gray-700 focus:border-purple-500"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </label>
  );
}

export function TournamentList({ tournaments }: TournamentListProps) {
  const t = useTranslations("tournaments");
  const [statusFilter, setStatusFilter] = useState<TournamentStatus | "all">("all");
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");

  // Derive unique game and format values from data
  const games = useMemo(() => {
    const set = new Set(tournaments.map((t) => t.game).filter(Boolean));
    return Array.from(set) as string[];
  }, [tournaments]);

  const formats = useMemo(() => {
    const set = new Set(
      tournaments.map((t) => t.tournament_format).filter(Boolean)
    );
    return Array.from(set) as string[];
  }, [tournaments]);

  const filtered = useMemo(() => {
    return tournaments.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (gameFilter !== "all" && t.game !== gameFilter) return false;
      if (formatFilter !== "all" && t.tournament_format !== formatFilter) return false;
      return true;
    });
  }, [tournaments, statusFilter, gameFilter, formatFilter]);

  const hasActiveFilters = statusFilter !== "all" || gameFilter !== "all" || formatFilter !== "all";

  const statusOptions = STATUS_FILTERS.map((filter) => ({
    value: filter.key,
    label: t(filter.labelKey as "filterAll" | "filterActive" | "filterUpcoming" | "filterCompleted"),
  }));

  const gameOptions = [
    { value: "all", label: t("filterAllGames") },
    ...games.map((game) => ({ value: game, label: game })),
  ];

  const formatOptions = [
    { value: "all", label: t("filterAllFormats") },
    ...formats.map((format) => ({ value: format, label: FORMAT_LABELS[format] ?? format })),
  ];

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
        </div>
        {hasActiveFilters && (
          <button
            onClick={() => { setStatusFilter("all"); setGameFilter("all"); setFormatFilter("all"); }}
            className="text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:text-red-400 transition-colors"
          >
            ✕ {t("clearFilters")}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-gray-800/60 bg-[#121620] p-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FilterSelect
            label={t("status")}
            value={statusFilter}
            options={statusOptions}
            onChange={(value) => setStatusFilter(value as TournamentStatus | "all")}
          />

          {games.length > 1 && (
            <FilterSelect
              label={t("game")}
              value={gameFilter}
              options={gameOptions}
              onChange={setGameFilter}
            />
          )}

          {formats.length > 1 && (
            <FilterSelect
              label={t("filterFormat")}
              value={formatFilter}
              options={formatOptions}
              onChange={setFormatFilter}
            />
          )}
        </div>
      </div>

      {/* Count */}
      {hasActiveFilters && (
        <p className="mb-4 text-[11px] text-gray-600">
          {t("resultsFound", { count: filtered.length })}
        </p>
      )}

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-gray-800 bg-[#121620]">
          <p className="text-sm text-gray-600">{t("noTournaments")}</p>
        </div>
      )}
    </div>
  );
}
