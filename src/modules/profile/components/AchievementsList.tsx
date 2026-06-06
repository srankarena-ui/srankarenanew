"use client";

import { cn } from "@/core/lib/cn";
import { Card } from "@/core/ui/Card";
import { useTranslations } from "next-intl";
import {
  ACHIEVEMENT_DEFINITIONS,
  getTier,
  getProgress,
  getNextTier,
  TIER_BG_CLASSES,
} from "@/core/lib/achievements";
import type { AchievementTier } from "@/core/types";

interface AchievementsListProps {
  achievementsData: { id: string; value: number }[] | null;
}

export function AchievementsList({ achievementsData }: AchievementsListProps) {
  const t = useTranslations("profile");

  if (!achievementsData) return null;

  return (
    <div>
      <h2 className="mb-4 text-[10px] uppercase tracking-[0.2em] text-gray-400">
        Arena Combat Badges
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {ACHIEVEMENT_DEFINITIONS.map((def) => {
          const data = achievementsData.find((a) => a.id === def.id);
          const value = data?.value || 0;
          const tier = getTier(value, def.tiers);
          const progress = getProgress(value, tier, def.tiers);
          const next = getNextTier(tier, def.tiers);

          return (
            <AchievementBadge
              key={def.id}
              name={def.name}
              description={def.description}
              currentValue={value}
              tier={tier}
              progress={progress}
              nextThreshold={next?.threshold}
              nextTier={next?.tier}
            />
          );
        })}
      </div>
      <p className="mt-4 text-[8px] font-bold uppercase tracking-[0.15em] text-gray-600">
        * Achievements are calculated based solely on matches played after account linking.
      </p>
    </div>
  );
}

function AchievementBadge({
  name,
  description,
  currentValue,
  tier,
  progress,
  nextThreshold,
  nextTier,
}: {
  name: string;
  description: string;
  currentValue: number;
  tier: AchievementTier | null;
  progress: number;
  nextThreshold?: number;
  nextTier?: AchievementTier;
}) {
  return (
    <Card className="relative overflow-hidden">
      {/* Tier indicator */}
      {tier && (
        <div
          className={cn(
            "absolute right-3 top-3 rounded-full border px-2 py-0.5 text-[8px]",
            TIER_BG_CLASSES[tier]
          )}
        >
          {tier === "s_rank" ? "S-RANK" : tier}
        </div>
      )}

      <h4 className="text-sm uppercase tracking-wider text-white">
        {name}
      </h4>
      <p className="mt-1 text-[10px] text-gray-500">{description}</p>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[9px] font-bold text-gray-500">
          <span>{currentValue}</span>
          {nextThreshold && <span>{nextThreshold}</span>}
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-800">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              tier === "s_rank"
                ? "bg-[var(--color-accent-hover)]"
                : tier === "platinum"
                  ? "bg-cyan-500"
                  : tier === "gold"
                    ? "bg-yellow-500"
                    : tier === "silver"
                      ? "bg-gray-400"
                      : "bg-amber-700"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        {nextTier && (
          <p className="mt-1 text-[8px] font-bold text-gray-600">
            Next: {nextTier === "s_rank" ? "S-Rank" : nextTier}
          </p>
        )}
      </div>
    </Card>
  );
}
