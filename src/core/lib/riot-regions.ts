export function getRiotRegionTranslationKey(region: string | null | undefined) {
  if (!region) return null;
  return `region_${region.toLowerCase()}`;
}