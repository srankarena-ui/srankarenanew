import { Card } from "@/core/ui/Card";
import { getRankForXp, getNextRank, getXpProgress } from "@/core/lib/ranks";
import type { Profile } from "@/core/types";

interface ArenaProgressionProps {
  profile: Profile;
}

export function ArenaProgression({ profile }: ArenaProgressionProps) {
  const xp = profile.experience ?? 0;
  const currentRank = getRankForXp(xp);
  const nextRank = getNextRank(currentRank);
  const progress = getXpProgress(xp, currentRank);

  return (
    <Card>
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
        Arena Progression
      </h3>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-500">
          Current Rank
        </span>
        <span
          className="text-2xl uppercase italic tracking-tighter"
          style={{ color: currentRank.color }}
        >
          Rank {currentRank.rank}
        </span>
      </div>

      {/* XP bar */}
      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progress}%`,
              backgroundColor: currentRank.color,
              boxShadow: `0 0 8px ${currentRank.color}80`,
            }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.15em] text-gray-500">
          <span>{xp} Total XP</span>
          {nextRank ? (
            <span style={{ color: nextRank.color }}>{nextRank.minXp} XP</span>
          ) : (
            <span className="text-fuchsia-400">MAX</span>
          )}
        </div>
      </div>
    </Card>
  );
}
