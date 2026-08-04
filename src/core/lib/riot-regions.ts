// Sentinela de "cualquier región vale" para el campo region de un torneo.
// No es un código de plataforma real, así que va antes de la lista y se
// filtra explícitamente en getRiotCluster/getRiotRegionTranslationKey.
export const GLOBAL_REGION = "global";

export const RIOT_REGIONS: { value: string; label: string }[] = [
  { value: "na1",  label: "North America" },
  { value: "euw1", label: "Europe West" },
  { value: "eun1", label: "Europe Nordic & East" },
  { value: "kr",   label: "Korea" },
  { value: "br1",  label: "Brazil" },
  { value: "la1",  label: "Latin America North" },
  { value: "la2",  label: "Latin America South" },
  { value: "jp1",  label: "Japan" },
  { value: "tr1",  label: "Turkey" },
  { value: "ru",   label: "Russia" },
  { value: "oc1",  label: "Oceania" },
  { value: "ph2",  label: "Philippines" },
  { value: "sg2",  label: "Singapore" },
  { value: "th2",  label: "Thailand" },
  { value: "tw2",  label: "Taiwan" },
  { value: "vn2",  label: "Vietnam" },
];

export const RIOT_REGIONS_WITH_GLOBAL: { value: string; label: string }[] = [
  { value: GLOBAL_REGION, label: "🌍 Global" },
  ...RIOT_REGIONS,
];

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