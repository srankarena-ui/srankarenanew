import type { Profile } from "@/core/types";

const CLASH_ROYALE_API_BASE = "https://api.clashroyale.com/v1";

type ClashRoyalePlayerDisplay = {
  tag: string;
  name: string;
};

function normalizeClashRoyaleTag(tag: string) {
  const compactTag = tag.trim().replace(/\s+/g, "").toUpperCase();
  if (!compactTag) return null;

  return compactTag.startsWith("#") ? compactTag : `#${compactTag}`;
}

export async function fetchClashRoyalePlayerDisplay(tag: string): Promise<ClashRoyalePlayerDisplay | null> {
  const normalizedTag = normalizeClashRoyaleTag(tag);
  const apiKey = process.env.SUPERCELL_API_KEY;

  if (!normalizedTag || !apiKey) return null;

  const response = await fetch(`${CLASH_ROYALE_API_BASE}/players/${encodeURIComponent(normalizedTag)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = await response.json() as ClashRoyalePlayerDisplay;
  return { tag: data.tag, name: data.name };
}

export async function withResolvedClashRoyaleName(profile: Profile): Promise<Profile> {
  if (!profile.cr_tag || profile.cr_name) return profile;

  const player = await fetchClashRoyalePlayerDisplay(profile.cr_tag);
  if (!player?.name) return profile;

  return {
    ...profile,
    cr_tag: player.tag,
    cr_name: player.name,
  };
}