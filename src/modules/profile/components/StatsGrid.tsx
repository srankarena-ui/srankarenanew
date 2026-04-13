"use client";

import { Card } from "@/core/ui/Card";
import { useTranslations } from "next-intl";
import type { ArenaStats } from "@/core/types";

interface StatsGridProps {
  stats: ArenaStats;
}

interface StatItem {
  labelKey: string;
  value: number;
  icon: React.ReactNode;
}

export function StatsGrid({ stats }: StatsGridProps) {
  const t = useTranslations("profile");

  const items: StatItem[] = [
    {
      labelKey: "pentaKills",
      value: stats.penta_kills_total,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
          <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26z" />
        </svg>
      ),
    },
    {
      labelKey: "wardsPlaced",
      value: stats.wards_placed_total,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ),
    },
    {
      labelKey: "missingPings",
      value: stats.ping_missing_count,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      ),
    },
    {
      labelKey: "tournamentWins",
      value: stats.tournament_wins,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      ),
    },
    {
      labelKey: "dragonSouls",
      value: stats.dragon_souls_total,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
    },
    {
      labelKey: "kills",
      value: stats.kills_total,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      <h2 className="mb-4 text-lg font-black uppercase italic tracking-tighter text-white">
        {t("stats")}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <Card key={item.labelKey} className="text-center">
            <div className="mb-2 flex justify-center">{item.icon}</div>
            <p className="text-2xl font-black text-white">{item.value}</p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">
              {t(item.labelKey as "pentaKills" | "wardsPlaced" | "missingPings" | "tournamentWins" | "dragonSouls" | "kills")}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
