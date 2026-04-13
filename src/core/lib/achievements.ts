import type { AchievementTier, ArenaStats } from "@/core/types";

type AchievementKey = "penta_kills_total" | "wards_placed_total" | "ping_missing_count" | "tournament_wins" | "dragon_souls_total";

interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  key: AchievementKey;
  tiers: Record<AchievementTier, number>;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: "pentakills",
    name: "Pentakill Master",
    description: "Accumulate pentakills across all games",
    key: "penta_kills_total",
    tiers: { bronze: 1, silver: 5, gold: 15, platinum: 30, s_rank: 50 },
  },
  {
    id: "wards",
    name: "Vision Control",
    description: "Place wards across all games",
    key: "wards_placed_total",
    tiers: { bronze: 100, silver: 500, gold: 2000, platinum: 5000, s_rank: 10000 },
  },
  {
    id: "missing_pings",
    name: "Missing Pinger",
    description: "Use missing pings across all games",
    key: "ping_missing_count",
    tiers: { bronze: 50, silver: 200, gold: 1000, platinum: 3000, s_rank: 10000 },
  },
  {
    id: "tournament_wins",
    name: "Arena Champion",
    description: "Win tournaments on S-Rank Arena",
    key: "tournament_wins",
    tiers: { bronze: 1, silver: 3, gold: 10, platinum: 25, s_rank: 50 },
  },
  {
    id: "dragon_souls",
    name: "Dragon Slayer",
    description: "Claim dragon souls across all games",
    key: "dragon_souls_total",
    tiers: { bronze: 5, silver: 20, gold: 50, platinum: 100, s_rank: 200 },
  },
];

const TIER_ORDER: AchievementTier[] = ["bronze", "silver", "gold", "platinum", "s_rank"];

export function getTier(value: number, tiers: Record<AchievementTier, number>): AchievementTier | null {
  let current: AchievementTier | null = null;
  for (const tier of TIER_ORDER) {
    if (value >= tiers[tier]) {
      current = tier;
    } else {
      break;
    }
  }
  return current;
}

export function getNextTier(
  currentTier: AchievementTier | null,
  tiers: Record<AchievementTier, number>
): { tier: AchievementTier; threshold: number } | null {
  if (currentTier === "s_rank") return null;
  const currentIndex = currentTier ? TIER_ORDER.indexOf(currentTier) : -1;
  const nextTier = TIER_ORDER[currentIndex + 1];
  if (!nextTier) return null;
  return { tier: nextTier, threshold: tiers[nextTier] };
}

export function getProgress(value: number, currentTier: AchievementTier | null, tiers: Record<AchievementTier, number>): number {
  const next = getNextTier(currentTier, tiers);
  if (!next) return 100;
  const currentThreshold = currentTier ? tiers[currentTier] : 0;
  const range = next.threshold - currentThreshold;
  const progress = value - currentThreshold;
  return Math.min(100, Math.round((progress / range) * 100));
}

export const TIER_COLORS: Record<AchievementTier, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  platinum: "#00d4ff",
  s_rank: "#a855f7",
};

export const TIER_BG_CLASSES: Record<AchievementTier, string> = {
  bronze: "bg-amber-900/30 border-amber-700/50 text-amber-400",
  silver: "bg-gray-500/20 border-gray-400/50 text-gray-300",
  gold: "bg-yellow-900/30 border-yellow-600/50 text-yellow-400",
  platinum: "bg-cyan-900/30 border-cyan-500/50 text-cyan-400",
  s_rank: "bg-purple-900/30 border-purple-500/50 text-purple-400",
};
