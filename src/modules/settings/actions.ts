"use server";

import { createClient } from "@/core/supabase/server";
import { revalidatePath } from "next/cache";
import { getVerificationConfig } from "@/modules/admin/actions";
import { getRiotVerificationTargetIconId } from "@/core/lib/riot-verification";

const RIOT_ICON_VERIFICATION_TTL_MS = 15 * 60 * 1000;
const CLASH_ROYALE_API_BASE = "https://api.clashroyale.com/v1";

type ClashRoyalePlayer = {
  tag: string;
  name: string;
};

function normalizeCRTag(tag: string) {
  const compactTag = tag.trim().replace(/\s+/g, "").toUpperCase();
  if (!compactTag) return null;

  const normalizedTag = compactTag.startsWith("#") ? compactTag : `#${compactTag}`;
  if (!/^#[A-Z0-9]+$/.test(normalizedTag)) return null;

  return normalizedTag;
}

function normalizeCRToken(token: string) {
  return token.trim().replace(/\s+/g, "");
}

async function fetchClashRoyalePlayer(tag: string) {
  const apiKey = process.env.SUPERCELL_API_KEY;
  if (!apiKey) return { error: "Supercell API key not configured" };

  const response = await fetch(`${CLASH_ROYALE_API_BASE}/players/${encodeURIComponent(tag)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    if (response.status === 404) return { error: "Clash Royale player not found" };
    if (response.status === 403) {
      return { error: "Supercell API rejected the request. Add your server IP to the developer key allowlist or disable Clash Royale verification in admin for testing." };
    }
    if (response.status === 429) return { error: "Clash Royale API rate limit exceeded. Try again shortly." };
    return { error: "Failed to fetch Clash Royale player" };
  }

  const data = await response.json() as ClashRoyalePlayer;
  return { data };
}

async function verifyClashRoyaleToken(tag: string, token: string) {
  const apiKey = process.env.SUPERCELL_API_KEY;
  if (!apiKey) return { error: "Supercell API key not configured" };

  const normalizedToken = normalizeCRToken(token);
  if (!normalizedToken) return { error: "Clash Royale verification token is required" };

  const response = await fetch(`${CLASH_ROYALE_API_BASE}/players/${encodeURIComponent(tag)}/verifytoken`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: normalizedToken }),
  });

  if (!response.ok) {
    if ([400, 403, 404].includes(response.status)) {
      return { error: "Invalid or expired Clash Royale verification token. Copy a fresh player token from the game settings and try again." };
    }
    if (response.status === 429) {
      return { error: "Clash Royale API rate limit exceeded. Try again shortly." };
    }
    return { error: "Clash Royale verification failed" };
  }

  const data = await response.json() as { status?: string };
  if (data.status && data.status.toLowerCase() !== "ok") {
    return { error: "Invalid or expired Clash Royale verification token. Copy a fresh player token from the game settings and try again." };
  }

  return { success: true };
}

function getCluster(platform: string): string {
  const p = platform.toLowerCase();
  if (["na1", "br1", "la1", "la2"].includes(p)) return "americas";
  if (["euw1", "eun1", "tr1", "ru"].includes(p)) return "europe";
  if (["kr", "jp1"].includes(p)) return "asia";
  return "sea";
}

async function fetchRiotIdentity(gameName: string, tagline: string, region: string) {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) return { error: "Riot API key not configured" };

  const cleanGameName = gameName.trim();
  const cleanTagline = tagline.trim();
  const cleanRegion = region.trim().toLowerCase();
  const cluster = getCluster(cleanRegion);

  const accountUrl = `https://${cluster}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(cleanGameName)}/${encodeURIComponent(cleanTagline)}`;
  const accountRes = await fetch(accountUrl, {
    headers: { "X-Riot-Token": apiKey },
  });

  if (!accountRes.ok) {
    if (accountRes.status === 404) return { error: "Riot account not found" };
    return { error: "Riot API error" };
  }

  const accountData = await accountRes.json() as {
    puuid: string;
    gameName: string;
    tagLine: string;
  };

  const summonerUrl = `https://${cleanRegion}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${accountData.puuid}`;
  const summonerRes = await fetch(summonerUrl, {
    headers: { "X-Riot-Token": apiKey },
  });
  if (!summonerRes.ok) return { error: "Summoner not found in this region" };

  const summonerData = await summonerRes.json() as {
    profileIconId?: number;
  };

  return {
    data: {
      puuid: accountData.puuid,
      gameName: accountData.gameName,
      tagLine: accountData.tagLine,
      region: cleanRegion,
      profileIconId: summonerData.profileIconId ?? 0,
    },
  };
}

async function ensureRiotAccountAvailable(userId: string, puuid: string) {
  const supabase = await createClient();
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("riot_puuid", puuid)
    .neq("id", userId)
    .maybeSingle();

  if (existingProfile) {
    return { error: "This Riot account is already linked to another S-Rank Arena account" };
  }

  return {};
}

async function ensureCRAccountAvailable(userId: string, tag: string) {
  const supabase = await createClient();
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("cr_tag", tag)
    .neq("id", userId)
    .maybeSingle();

  if (existingProfile) {
    return { error: "This Clash Royale account is already linked to another S-Rank Arena account" };
  }

  return {};
}

export async function startRiotIconVerification(gameName: string, tagline: string, region: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const lookup = await fetchRiotIdentity(gameName, tagline, region);
  if (lookup.error || !lookup.data) return { error: lookup.error ?? "Verification failed" };

  const availability = await ensureRiotAccountAvailable(user.id, lookup.data.puuid);
  if (availability.error) return availability;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + RIOT_ICON_VERIFICATION_TTL_MS).toISOString();
  const { error } = await supabase
    .from("riot_verification_challenges")
    .upsert({
      user_id: user.id,
      game_name: lookup.data.gameName,
      tagline: lookup.data.tagLine,
      region: lookup.data.region,
      puuid: lookup.data.puuid,
      initial_profile_icon_id: lookup.data.profileIconId,
      current_profile_icon_id: lookup.data.profileIconId,
      created_at: now.toISOString(),
      expires_at: expiresAt,
      verified_at: null,
    });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function linkRiotAccountDirect(gameName: string, tagline: string, region: string) {
  const verificationConfig = await getVerificationConfig();
  if (verificationConfig.require_riot_verification) {
    return { error: "Direct Riot linking is disabled. Complete verification or ask an admin to disable it temporarily." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const lookup = await fetchRiotIdentity(gameName, tagline, region);
  if (lookup.error || !lookup.data) return { error: lookup.error ?? "Verification failed" };

  const availability = await ensureRiotAccountAvailable(user.id, lookup.data.puuid);
  if (availability.error) return availability;

  const { error } = await supabase
    .from("profiles")
    .update({
      riot_puuid: lookup.data.puuid,
      riot_gamename: lookup.data.gameName,
      riot_tagline: lookup.data.tagLine,
      lol_region: lookup.data.region,
      riot_linked_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  await supabase.from("riot_verification_challenges").delete().eq("user_id", user.id);

  revalidatePath("/", "layout");
  return { success: true };
}

export async function completeRiotIconVerification() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: challenge } = await supabase
    .from("riot_verification_challenges")
    .select("*")
    .eq("user_id", user.id)
    .is("verified_at", null)
    .maybeSingle();

  if (!challenge) return { error: "No pending Riot verification found" };
  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    await supabase.from("riot_verification_challenges").delete().eq("user_id", user.id);
    return { error: "Verification expired. Start again." };
  }

  const lookup = await fetchRiotIdentity(challenge.game_name, challenge.tagline, challenge.region);
  if (lookup.error || !lookup.data) return { error: lookup.error ?? "Verification failed" };
  if (lookup.data.puuid !== challenge.puuid) {
    return { error: "This Riot ID no longer matches the original verification challenge" };
  }

  const availability = await ensureRiotAccountAvailable(user.id, challenge.puuid);
  if (availability.error) return availability;
  const targetProfileIconId = getRiotVerificationTargetIconId(challenge);
  if (lookup.data.profileIconId !== targetProfileIconId) {
    return { error: `Your summoner icon does not match the required verification icon yet. Set icon #${targetProfileIconId} and try again.` };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      riot_puuid: challenge.puuid,
      riot_gamename: lookup.data.gameName,
      riot_tagline: lookup.data.tagLine,
      lol_region: challenge.region,
      riot_linked_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };

  const { error: challengeError } = await supabase
    .from("riot_verification_challenges")
    .update({
      current_profile_icon_id: lookup.data.profileIconId,
      verified_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (challengeError) return { error: challengeError.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function cancelRiotIconVerification() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("riot_verification_challenges")
    .delete()
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function unlinkRiotAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({
      riot_puuid: null,
      riot_gamename: null,
      riot_tagline: null,
      lol_region: null,
      riot_linked_at: null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  await supabase.from("riot_verification_challenges").delete().eq("user_id", user.id);

  revalidatePath("/", "layout");
  return { success: true };
}

export async function verifyCRAccount(tag: string, token: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const normalizedTag = normalizeCRTag(tag);
  if (!normalizedTag) return { error: "Invalid Clash Royale player tag" };

  const trimmedToken = token.trim();
  if (!trimmedToken) return { error: "Clash Royale verification token is required" };

  const playerLookup = await fetchClashRoyalePlayer(normalizedTag);
  if (playerLookup.error || !playerLookup.data) {
    return { error: playerLookup.error ?? "Clash Royale player not found" };
  }

  const availability = await ensureCRAccountAvailable(user.id, playerLookup.data.tag);
  if (availability.error) return availability;

  const verification = await verifyClashRoyaleToken(playerLookup.data.tag, trimmedToken);
  if (verification.error) return verification;

  const { error } = await supabase
    .from("profiles")
    .update({
      cr_tag: playerLookup.data.tag,
      cr_name: playerLookup.data.name,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function linkCRAccountDirect(tag: string) {
  const verificationConfig = await getVerificationConfig();
  if (verificationConfig.require_clash_royale_verification) {
    return { error: "Direct Clash Royale linking is disabled. Complete verification or ask an admin to disable it temporarily." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const normalizedTag = normalizeCRTag(tag);
  if (!normalizedTag) return { error: "Invalid Clash Royale player tag" };

  const playerLookup = await fetchClashRoyalePlayer(normalizedTag);
  const resolvedTag = playerLookup.data?.tag ?? normalizedTag;
  const resolvedName = playerLookup.data?.name ?? null;

  const availability = await ensureCRAccountAvailable(user.id, resolvedTag);
  if (availability.error) return availability;

  const { error } = await supabase
    .from("profiles")
    .update({
      cr_tag: resolvedTag,
      cr_name: resolvedName,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function getVerificationBypassState() {
  return getVerificationConfig();
}

export async function unlinkCRAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ cr_tag: null, cr_name: null })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const username = formData.get("username") as string;

  const { error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}
