"use client";

import { cn } from "@/core/lib/cn";
import { useTranslations } from "next-intl";
import type { MatchWithPlayers, TournamentParticipant, Profile } from "@/core/types";

interface StandingsProps {
  matches: MatchWithPlayers[];
  participants: (TournamentParticipant & { profile: Profile })[];
  demoMode: boolean;
}

interface StandingEntry {
  id: string;
  name: string;
  wins: number;
  losses: number;
}

export function Standings({ matches, participants, demoMode }: StandingsProps) {
  const t = useTranslations("tournaments");
  // Build standings from match results
  const statsMap = new Map<string, StandingEntry>();

  for (const match of matches) {
    if (match.status !== "completed") continue;

    if (match.player1_id && match.player1) {
      const existing = statsMap.get(match.player1_id) || {
        id: match.player1_id,
        name: match.player1.username || t("unknownPlayer"),
        wins: 0,
        losses: 0,
      };
      if (match.winner_id === match.player1_id) existing.wins++;
      else existing.losses++;
      statsMap.set(match.player1_id, existing);
    }

    if (match.player2_id && match.player2) {
      const existing = statsMap.get(match.player2_id) || {
        id: match.player2_id,
        name: match.player2.username || t("unknownPlayer"),
        wins: 0,
        losses: 0,
      };
      if (match.winner_id === match.player2_id) existing.wins++;
      else existing.losses++;
      statsMap.set(match.player2_id, existing);
    }
  }

  const standings = Array.from(statsMap.values()).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.losses - b.losses;
  });

  // Assign ranks (same rank for tied players)
  let currentRank = 1;
  const rankedStandings = standings.map((entry, i) => {
    if (i > 0) {
      const prev = standings[i - 1];
      if (entry.wins !== prev.wins || entry.losses !== prev.losses) {
        currentRank = i + 1;
      }
    }
    return { ...entry, rank: currentRank };
  });

  if (rankedStandings.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-gray-800 bg-[#121620]">
        <p className="text-sm text-gray-600">{t("noStandings")}</p>
      </div>
    );
  }

  // Top 3 podium
  const top3 = rankedStandings.slice(0, 3);

  const PODIUM_COLORS: Record<number, string> = {
    1: "bg-yellow-500 text-black",
    2: "bg-gray-400 text-black",
    3: "bg-amber-700 text-white",
  };

  return (
    <div>
      <h2 className="mb-5 text-sm font-black uppercase tracking-wider text-white">
        {t("standings")}
      </h2>

      {/* Podium — top 3 */}
      {top3.length >= 1 && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          {top3.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-2xl border border-gray-800/60 bg-[#121620] px-5 py-4"
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black",
                  PODIUM_COLORS[entry.rank] || "bg-gray-800 text-gray-400"
                )}
              >
                {entry.rank}
              </span>
              <span className="truncate text-sm font-bold text-white">{entry.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Full table */}
      <div className="overflow-hidden rounded-xl border border-gray-800/60">
        {/* Header */}
        <div className="flex items-center bg-[#0d1017] px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
          <span className="w-16">{t("rankColumn")}</span>
          <span className="flex-1">{t("playerColumn")}</span>
          <span className="w-12 text-center">{t("winsShort")}</span>
          <span className="w-12 text-center">{t("lossesShort")}</span>
        </div>

        {/* Rows */}
        {rankedStandings.map((entry, i) => (
          <div
            key={entry.id}
            className={cn(
              "flex items-center px-4 py-3 transition-colors",
              i % 2 === 0 ? "bg-[#121620]" : "bg-[#0f1319]",
              entry.rank <= 3 && "border-l-2 border-l-purple-500/50"
            )}
          >
            <span className="w-16 text-sm font-bold text-gray-400">{entry.rank}</span>
            <span className="flex-1 truncate text-sm font-semibold text-white">{entry.name}</span>
            <span className="w-12 text-center text-sm font-bold text-green-400">{entry.wins}</span>
            <span className="w-12 text-center text-sm font-bold text-red-400">{entry.losses}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
