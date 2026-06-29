// Shared donor tier logic — used by the vault donor wall and the profile badge.
export type DonorTier = { name: string; color: string; emoji: string }

// Thresholds in USD cents of total donated value.
const TIERS: { min: number; tier: DonorTier }[] = [
  { min: 10000, tier: { name: "Diamante", color: "#5fd3f3", emoji: "💎" } },
  { min: 5000,  tier: { name: "Oro",      color: "#f5c451", emoji: "🥇" } },
  { min: 2000,  tier: { name: "Plata",    color: "#cbd5e1", emoji: "🥈" } },
  { min: 1,     tier: { name: "Bronce",   color: "#cd7f32", emoji: "🥉" } },
]

export function donorTier(totalCents: number): DonorTier | null {
  return TIERS.find(t => totalCents >= t.min)?.tier ?? null
}

export function fmtUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
