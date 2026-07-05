"use client";

import { useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { cn } from "@/core/lib/cn";
import { useTournamentStore } from "@/modules/tournaments/store";
import { BracketMatch } from "./BracketMatch";
import { Standings } from "./Standings";
import type { Tournament, TournamentParticipant, Profile, MatchWithPlayers } from "@/core/types";

interface BracketViewProps {
  tournament: Tournament;
  matches: MatchWithPlayers[];
  participants: (TournamentParticipant & { profile: Profile })[];
  isAdmin: boolean;
}

export function BracketView({ tournament, matches, participants, isAdmin }: BracketViewProps) {
  const t = useTranslations("tournaments");
  const router = useRouter();
  const { isScanning, setScanning, bracketSubTab, setBracketSubTab } = useTournamentStore();

  // Demo bracket data for 16 players when no real matches exist
  const demoMode = matches.length === 0;
  const displayMatches: MatchWithPlayers[] = demoMode ? generateDemoBracket() : matches;

  // Group matches by round
  const rounds = displayMatches.reduce<Record<number, MatchWithPlayers[]>>((acc, match) => {
    const round = match.round_number;
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {});

  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);
  const totalRounds = roundNumbers.length;

  // Auto-scan polling
  const hasActiveMatches = !demoMode && matches.some(
    (m) => m.status === "pending" && m.player1_id && m.player2_id
  );

  const runAutoScan = useCallback(async () => {
    if (!hasActiveMatches || tournament.status !== "active") return;
    setScanning(true);

    const activeMatches = matches.filter(
      (m) => m.status === "pending" && m.player1_id && m.player2_id
    );

    for (const match of activeMatches) {
      try {
        const endpoint =
          tournament.game === "Clash Royale" ? "/api/cr/scan" : "/api/riot/scan";

        const body = { tournamentMatchId: match.id };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.winnerId) {
            router.refresh();
          }
        }
      } catch {
        // Scan errors are non-critical
      }
    }

    setScanning(false);
  }, [hasActiveMatches, matches, tournament, router, setScanning]);

  useEffect(() => {
    if (!hasActiveMatches || tournament.status !== "active") return;
    const interval = setInterval(runAutoScan, 5000);
    return () => clearInterval(interval);
  }, [hasActiveMatches, tournament.status, runAutoScan]);

  if (displayMatches.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-gray-800 bg-[#121620]">
        <p className="text-sm text-gray-600">No bracket generated yet</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Bracket / Standings toggle ── */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-wider text-white">
          {tournament.title}
        </h2>
        <div className="flex overflow-hidden rounded-lg border border-gray-800">
          <button
            onClick={() => setBracketSubTab("bracket")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-[10px] transition-colors",
              bracketSubTab === "bracket"
                ? "bg-[var(--color-accent)] text-white"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M4 6h4v4H4zM16 6h4v4h-4zM10 14h4v4h-4zM4 6h4v8h6M16 6h-4v8h-2" />
            </svg>
            Bracket
          </button>
          <button
            onClick={() => setBracketSubTab("standings")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-[10px] transition-colors",
              bracketSubTab === "standings"
                ? "bg-[var(--color-accent)] text-white"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
            Standings
          </button>
        </div>
      </div>

      {/* Demo banner */}
      {demoMode && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-yellow-700/30 bg-yellow-900/10 px-4 py-2">
          <span className="text-[10px] font-bold text-yellow-400">
            ⚡ Demo bracket — 16 players preview
          </span>
        </div>
      )}

      {/* Scanning indicator */}
      {isScanning && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-purple-700/30 bg-purple-900/20 px-4 py-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-accent-hover)]" />
          <span className="text-[10px] font-bold text-[var(--color-accent)]">
            Scanning for results...
          </span>
        </div>
      )}

      {bracketSubTab === "standings" ? (
        <Standings matches={displayMatches} participants={participants} demoMode={demoMode} />
      ) : (
        /* ── Bracket grid ── */
        <div className="overflow-x-auto pb-4">
          {/* Round headers row */}
          <div className="flex gap-6" style={{ minWidth: `${totalRounds * 300}px` }}>
            {roundNumbers.map((roundNum) => {
              const roundLabel =
                roundNum === totalRounds
                  ? "Final"
                  : roundNum === totalRounds - 1
                    ? "Semifinal"
                    : `Round ${roundNum}`;

              return (
                <div key={roundNum} className="flex flex-col" style={{ minWidth: "270px", flex: 1 }}>
                  {/* Round header — Battlefy style */}
                  <div className="mb-1 flex items-center justify-between rounded-t-lg border border-gray-800/60 bg-[#0d1017] px-4 py-2.5">
                    <span className="text-[11px] uppercase tracking-wider text-white">
                      {roundLabel}
                    </span>
                    <span className="text-[9px] font-bold text-gray-500">
                      {tournament.series_format?.toUpperCase() || "Best of 1"}
                    </span>
                  </div>

                  {/* Matches column */}
                  <div className="flex flex-1 flex-col justify-around gap-3 pt-3">
                    {rounds[roundNum].map((match, idx) => (
                      <BracketMatch
                        key={match.id}
                        match={match}
                        matchLabel={`Match ${match.match_number + 1}`}
                        isAdmin={isAdmin}
                        seriesFormat={tournament.series_format}
                        game={tournament.game}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Demo bracket generator ──
const DEMO_NAMES = [
  "Shadow", "Blaze", "Frost", "Viper", "Storm", "Phoenix", "Raven", "Titan",
  "Omega", "Nova", "Cipher", "Hex", "Pulse", "Neon", "Apex", "Wraith",
];

function generateDemoBracket(): MatchWithPlayers[] {
  const matches: MatchWithPlayers[] = [];
  let matchIdx = 0;

  const r1Winners: string[] = [];
  for (let i = 0; i < 8; i++) {
    const p1Idx = i * 2;
    const p2Idx = i * 2 + 1;
    const winnerIdx = i % 2 === 0 ? p1Idx : p2Idx;
    r1Winners.push(`demo-p${winnerIdx}`);
    matches.push(demoMatch(matchIdx++, 1, `demo-p${p1Idx}`, DEMO_NAMES[p1Idx], `demo-p${p2Idx}`, DEMO_NAMES[p2Idx], `demo-p${winnerIdx}`, 1, 0, "completed"));
  }

  const r2Winners: string[] = [];
  for (let i = 0; i < 4; i++) {
    const p1Id = r1Winners[i * 2];
    const p2Id = r1Winners[i * 2 + 1];
    const winnerId = i % 2 === 0 ? p1Id : p2Id;
    r2Winners.push(winnerId);
    matches.push(demoMatch(matchIdx++, 2, p1Id, nameById(p1Id), p2Id, nameById(p2Id), winnerId, 1, 0, "completed"));
  }

  const sfWinners: string[] = [];
  for (let i = 0; i < 2; i++) {
    const p1Id = r2Winners[i * 2];
    const p2Id = r2Winners[i * 2 + 1];
    const winnerId = p1Id;
    sfWinners.push(winnerId);
    matches.push(demoMatch(matchIdx++, 3, p1Id, nameById(p1Id), p2Id, nameById(p2Id), winnerId, 1, 0, "completed"));
  }

  matches.push(demoMatch(matchIdx++, 4, sfWinners[0], nameById(sfWinners[0]), sfWinners[1], nameById(sfWinners[1]), null, 1, 1, "in_progress"));

  return matches;
}

function nameById(id: string): string {
  const idx = parseInt(id.replace("demo-p", ""), 10);
  return DEMO_NAMES[idx] || "Player";
}

function demoMatch(
  idx: number, round: number,
  p1Id: string, p1Name: string,
  p2Id: string, p2Name: string,
  winnerId: string | null,
  p1Score: number, p2Score: number,
  status: string
): MatchWithPlayers {
  return {
    id: `demo-${idx}`,
    tournament_id: "demo",
    round_number: round,
    match_number: idx,
    player1_id: p1Id,
    player2_id: p2Id,
    player1_score: p1Score,
    player2_score: p2Score,
    winner_id: winnerId,
    status,
    api_match_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    player1: { id: p1Id, username: p1Name, avatar_url: null, role: "player", riot_puuid: null, riot_game_name: null, riot_tag_line: null, clash_royale_tag: null, created_at: "", updated_at: "" },
    player2: { id: p2Id, username: p2Name, avatar_url: null, role: "player", riot_puuid: null, riot_game_name: null, riot_tag_line: null, clash_royale_tag: null, created_at: "", updated_at: "" },
  } as unknown as MatchWithPlayers;
}
