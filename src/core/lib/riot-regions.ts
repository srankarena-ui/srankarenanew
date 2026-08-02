export function getRiotRegionTranslationKey(region: string | null | undefined) {
  if (!region) return null;
  return `region_${region.toLowerCase()}`;
}

// Account-V1 y match-v5 se enrutan por cluster regional, no por plataforma
// (champion-mastery-v4 sí usa la plataforma tal cual: na1, euw1, ...).
export function getRiotCluster(platform: string | null | undefined): string {
  const p = (platform || "na1").toLowerCase();
  if (["na1", "br1", "la1", "la2"].includes(p)) return "americas";
  if (["euw1", "eun1", "tr1", "ru"].includes(p)) return "europe";
  if (["kr", "jp1"].includes(p)) return "asia";
  return "sea";
}