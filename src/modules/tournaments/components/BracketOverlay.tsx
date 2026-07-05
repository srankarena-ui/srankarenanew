import { BracketMatch } from "./BracketMatch";
import type { Tournament, MatchWithPlayers } from "@/core/types";

interface BracketOverlayProps {
  tournament: Tournament;
  matches: MatchWithPlayers[];
}

// Passive bracket render for OBS/Twitch browser-source overlays: no page chrome,
// no admin controls, no auto-scan polling — just the bracket grid.
export function BracketOverlay({ tournament, matches }: BracketOverlayProps) {
  if (matches.length === 0) {
    return <p className="p-4 text-xs text-gray-500">Bracket not generated yet.</p>;
  }

  const rounds = matches.reduce<Record<number, MatchWithPlayers[]>>((acc, match) => {
    (acc[match.round_number] ??= []).push(match);
    return acc;
  }, {});
  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);
  const totalRounds = roundNumbers.length;

  return (
    <div className="inline-flex gap-6 p-6">
      {roundNumbers.map((roundNum) => {
        const roundLabel =
          roundNum === totalRounds ? "Final" : roundNum === totalRounds - 1 ? "Semifinal" : `Round ${roundNum}`;

        return (
          <div key={roundNum} className="flex flex-col" style={{ minWidth: "270px" }}>
            <div className="mb-1 flex items-center justify-between rounded-t-lg border border-gray-800/60 bg-[#0d1017] px-4 py-2.5">
              <span className="text-[11px] uppercase tracking-wider text-white">{roundLabel}</span>
              <span className="text-[9px] font-bold text-gray-500">
                {tournament.series_format?.toUpperCase() || "Best of 1"}
              </span>
            </div>
            <div className="flex flex-1 flex-col justify-around gap-3 pt-3">
              {rounds[roundNum].map((match) => (
                <BracketMatch
                  key={match.id}
                  match={match}
                  matchLabel={`Match ${match.match_number + 1}`}
                  isAdmin={false}
                  seriesFormat={tournament.series_format}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
