"use client";

import { useEffect, useState } from "react";
import type { Database } from "@/core/types/database";
import { computeElapsedSeconds, formatClock } from "@/core/lib/football-clock";

type Scoreboard = Database["public"]["Tables"]["football_scoreboard"]["Row"];

const POLL_MS = 3000;

export function FootballScoreboardDisplay({ initial }: { initial: Scoreboard }) {
  const [scoreboard, setScoreboard] = useState(initial);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const pollId = setInterval(async () => {
      try {
        const res = await fetch("/api/football-scoreboard", { cache: "no-store" });
        if (res.ok) setScoreboard(await res.json());
      } catch {
        // ponytail: silent retry on next tick, no need to surface network blips on an overlay
      }
    }, POLL_MS);
    const tickId = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => {
      clearInterval(pollId);
      clearInterval(tickId);
    };
  }, []);

  const elapsed = computeElapsedSeconds(scoreboard.clock_seconds, scoreboard.clock_running, scoreboard.clock_started_at);

  return (
    <div className="inline-flex w-fit items-stretch font-sans text-white" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="flex items-center gap-2 rounded-l-lg bg-[#0b0e14] px-4 py-2">
        {scoreboard.home_flag_url && (
          <img src={scoreboard.home_flag_url} alt="" className="h-6 w-9 rounded-sm object-cover" />
        )}
        <span className="text-xl font-bold tracking-wide">{scoreboard.home_abbr}</span>
      </div>

      <div className="flex items-center gap-3 bg-[#F5A524] px-5 py-2 text-2xl font-extrabold text-black">
        <span>{scoreboard.home_score}</span>
        <span>-</span>
        <span>{scoreboard.away_score}</span>
      </div>

      <div className="flex items-center gap-2 rounded-r-lg bg-[#0b0e14] px-4 py-2">
        <span className="text-xl font-bold tracking-wide">{scoreboard.away_abbr}</span>
        {scoreboard.away_flag_url && (
          <img src={scoreboard.away_flag_url} alt="" className="h-6 w-9 rounded-sm object-cover" />
        )}
      </div>

      <div className="ml-3 flex items-center rounded-lg bg-[#0b0e14] px-3 py-2 font-mono text-xl">
        {formatClock(elapsed)}
        {scoreboard.added_time_minutes > 0 && (
          <span className="ml-1 text-sm text-[#F5A524]">+{scoreboard.added_time_minutes}</span>
        )}
      </div>
    </div>
  );
}
