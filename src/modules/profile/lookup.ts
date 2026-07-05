import type { createClient } from "@/core/supabase/server";
import type { Profile } from "@/core/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ProfileLookupResult =
  | { type: "found"; profile: Profile }
  | { type: "ambiguous"; matches: Profile[] }
  | { type: "not_found" };

// Split "Hydro-958338" -> { username: "Hydro", discriminator: "958338" }.
// Usernames never contain "-" (validated as ^[a-zA-Z0-9_]+$), so the last
// "-" always separates the tag unambiguously.
function splitProfileSlug(slug: string): { username: string; discriminator: string } | null {
  const i = slug.lastIndexOf("-");
  if (i <= 0 || i === slug.length - 1) return null;
  return { username: slug.slice(0, i), discriminator: slug.slice(i + 1) };
}

// Resolves a /profile/[slug] URL segment to a profile. Handles three cases:
// a bare username (works as long as it's unique), a "username-discriminator"
// tagged slug, and a raw profile id (legacy links).
export async function resolveProfileSlug(
  supabase: SupabaseServerClient,
  decodedSlug: string
): Promise<ProfileLookupResult> {
  const { data: exactMatches } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", decodedSlug);

  if (exactMatches && exactMatches.length === 1) {
    return { type: "found", profile: exactMatches[0] };
  }
  if (exactMatches && exactMatches.length > 1) {
    return { type: "ambiguous", matches: exactMatches };
  }

  const parsed = splitProfileSlug(decodedSlug);
  if (parsed) {
    const { data: tagged } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", parsed.username)
      .eq("discriminator", parsed.discriminator)
      .maybeSingle();
    if (tagged) return { type: "found", profile: tagged };
  }

  const { data: byId } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", decodedSlug)
    .maybeSingle();
  if (byId) return { type: "found", profile: byId };

  return { type: "not_found" };
}
