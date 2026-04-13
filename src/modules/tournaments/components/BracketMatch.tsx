"use client";

import { cn } from "@/core/lib/cn";
import { useTournamentStore } from "@/modules/tournaments/store";
import type { MatchWithPlayers, SeriesFormat } from "@/core/types";

interface BracketMatchProps {
  match: MatchWithPlayers;
  matchLabel?: string;
  isAdmin: boolean;
  seriesFormat: SeriesFormat;
}

export function BracketMatch({ match, matchLabel, isAdmin, seriesFormat }: BracketMatchProps) {
  const { openScoreModal, openResolutionModal } = useTournamentStore();

  const isBye = match.status === "bye";
  const isCompleted = match.status === "completed";
  const isPending = match.status === "pending";
  const isLive = match.status === "in_progress";
  const hasPlayers = match.player1_id || match.player2_id;

  function handleClick() {
    if (!hasPlayers) return;
    if (isAdmin && !isCompleted) {
      openResolutionModal(match);
    } else if (!isCompleted && hasPlayers) {
      openScoreModal(match);
    }
  }

  return (
    <div>
      {/* Match label */}
      {matchLabel && (
        <div className="mb-1 flex items-center gap-2">
          <span className="rounded bg-[#1a1f2e] px-2 py-0.5 text-[9px] font-bold text-gray-400">
            {matchLabel}
          </span>
          {isLive && (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              <span className="text-[8px] font-black uppercase tracking-widest text-red-400">
                Live
              </span>
            </span>
          )}
        </div>
      )}

      <div
        onClick={handleClick}
        className={cn(
          "overflow-hidden rounded-lg border transition-all",
          isCompleted && "border-gray-700/50",
          isBye && "border-gray-800/30 opacity-50",
          isPending && hasPlayers && "border-gray-700 cursor-pointer hover:border-purple-500/50",
          isPending && !hasPlayers && "border-gray-800/30 opacity-30",
          isLive && "border-purple-600/50 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
        )}
      >
        {/* Player 1 */}
        <PlayerSlot
          seed={match.match_number !== undefined ? match.match_number * 2 + 1 : undefined}
          name={match.player1?.username || (isBye && !match.player2_id ? "Bye" : "TBD")}
          score={match.player1_score}
          isWinner={match.winner_id === match.player1_id && match.player1_id !== null}
          isLoser={isCompleted && match.winner_id !== match.player1_id && match.player1_id !== null}
          isEmpty={!match.player1_id}
          position="top"
        />

        {/* Divider */}
        <div className="border-t border-gray-800/40" />

        {/* Player 2 */}
        <PlayerSlot
          seed={match.match_number !== undefined ? match.match_number * 2 + 2 : undefined}
          name={match.player2?.username || (isBye ? "Bye" : "TBD")}
          score={match.player2_score}
          isWinner={match.winner_id === match.player2_id && match.player2_id !== null}
          isLoser={isCompleted && match.winner_id !== match.player2_id && match.player2_id !== null}
          isEmpty={!match.player2_id}
          position="bottom"
        />
      </div>
    </div>
  );
}

function PlayerSlot({
  seed,
  name,
  score,
  isWinner,
  isLoser,
  isEmpty,
  position,
}: {
  seed?: number;
  name: string;
  score: number;
  isWinner: boolean;
  isLoser: boolean;
  isEmpty: boolean;
  position: "top" | "bottom";
}) {
  return (
    <div
      className={cn(
        "flex items-center",
        position === "top" ? "rounded-t-lg" : "rounded-b-lg",
        isWinner && "bg-purple-900/15",
        !isWinner && "bg-[#121620]"
      )}
    >
      {/* Seed number */}
      {seed !== undefined && !isEmpty && (
        <span className="flex h-full w-8 shrink-0 items-center justify-center bg-black/20 text-[10px] font-bold text-gray-600">
          {seed}
        </span>
      )}
      {seed !== undefined && isEmpty && (
        <span className="w-8 shrink-0" />
      )}

      {/* Player name */}
      <span
        className={cn(
          "flex-1 truncate px-3 py-2.5 text-xs font-semibold",
          isWinner && "text-white",
          isLoser && "text-gray-600",
          isEmpty && "text-gray-700 italic",
          !isWinner && !isLoser && !isEmpty && "text-gray-300"
        )}
      >
        {name}
      </span>

      {/* Score */}
      <span
        className={cn(
          "flex h-full w-10 shrink-0 items-center justify-center text-xs font-black",
          isWinner && "bg-purple-600/30 text-purple-300",
          isLoser && "text-gray-700",
          !isWinner && !isLoser && !isEmpty && "text-gray-500",
          isEmpty && "text-gray-800"
        )}
      >
        {!isEmpty ? score : "—"}
      </span>
    </div>
  );
}
