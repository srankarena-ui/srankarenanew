export interface RankDefinition {
  rank: string;
  minXp: number;
  color: string;
  bgClass: string;
  glowClass: string;
}

export const RANKS: RankDefinition[] = [
  { rank: "F", minXp: 0, color: "#6b7280", bgClass: "bg-gray-600", glowClass: "shadow-gray-600/30" },
  { rank: "E", minXp: 100, color: "#22c55e", bgClass: "bg-green-600", glowClass: "shadow-green-600/30" },
  { rank: "D", minXp: 300, color: "#3b82f6", bgClass: "bg-blue-600", glowClass: "shadow-blue-600/30" },
  { rank: "C", minXp: 600, color: "#a855f7", bgClass: "bg-purple-600", glowClass: "shadow-purple-600/30" },
  { rank: "B", minXp: 1000, color: "#f59e0b", bgClass: "bg-amber-500", glowClass: "shadow-amber-500/30" },
  { rank: "A", minXp: 2000, color: "#ef4444", bgClass: "bg-red-500", glowClass: "shadow-red-500/30" },
  { rank: "S", minXp: 5000, color: "#e879f9", bgClass: "bg-fuchsia-500", glowClass: "shadow-fuchsia-500/30" },
];

export function getRankForXp(xp: number): RankDefinition {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.minXp) current = r;
    else break;
  }
  return current;
}

export function getNextRank(currentRank: RankDefinition): RankDefinition | null {
  const idx = RANKS.indexOf(currentRank);
  if (idx < 0 || idx >= RANKS.length - 1) return null;
  return RANKS[idx + 1];
}

export function getXpProgress(xp: number, currentRank: RankDefinition): number {
  const next = getNextRank(currentRank);
  if (!next) return 100;
  const range = next.minXp - currentRank.minXp;
  const progress = xp - currentRank.minXp;
  return Math.min(100, Math.round((progress / range) * 100));
}
