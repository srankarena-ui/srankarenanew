import { createClient } from "@/core/supabase/server";
import { notFound } from "next/navigation";
import { ProfileHeader } from "@/modules/profile/components/ProfileHeader";
import { ArenaProgression } from "@/modules/profile/components/ArenaProgression";
import { GameConnections } from "@/modules/profile/components/LinkedAccounts";
import { DuosTeamsPanel } from "@/modules/profile/components/DuosTeamsPanel";
import { Dota2StatsPanel } from "@/modules/profile/components/Dota2StatsPanel";
import { getProfileDuosAndTeams } from "@/modules/profile/actions";
import { withResolvedClashRoyaleName } from "@/core/lib/clash-royale";

async function getSteamPersonaName(accountId: number): Promise<string | null> {
  const key = process.env.STEAM_API_KEY;
  if (!key) return null;
  const steamId64 = BigInt(accountId) + BigInt("76561197960265728");
  try {
    const res = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamId64}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data.response?.players?.[0]?.personaname as string) ?? null;
  } catch {
    return null;
  }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string; locale: string }>;
}) {
  const { username, locale } = await params;
  const decoded = decodeURIComponent(username);
  const supabase = await createClient();

  // Try lookup by username first, then by user ID as fallback
  let profile;
  const { data: byUsername } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", decoded)
    .single();

  if (byUsername) {
    profile = byUsername;
  } else {
    const { data: byId } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", decoded)
      .single();
    profile = byId;
  }

  if (!profile) notFound();

  profile = await withResolvedClashRoyaleName(profile);

  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = !!user && user.id === profile.id;

  const { duos, teams, pendingDuoInvites, pendingTeamInvites } =
    await getProfileDuosAndTeams(profile.id);

  const dotaPersonaName = profile.dota2_account_id
    ? await getSteamPersonaName(profile.dota2_account_id)
    : null;

  // Total value this user has donated to the vault, for the donor badge tier.
  const { data: donatedItems } = await supabase
    .from("vault_items")
    .select("price_cents")
    .eq("donor_profile_id", profile.id);
  const donationTotalCents = (donatedItems ?? []).reduce((sum, i) => sum + (i.price_cents ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <ProfileHeader profile={profile} locale={locale} donationTotalCents={donationTotalCents} />

      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        {/* Left sidebar */}
        <div className="space-y-6">
          <ArenaProgression profile={profile} />
          <GameConnections profile={profile} locale={locale} dotaPersonaName={dotaPersonaName} />
          <DuosTeamsPanel
            isOwner={isOwner}
            viewerUserId={user?.id ?? null}
            profileUserId={profile.id}
            duos={duos}
            teams={teams}
            pendingDuoInvites={pendingDuoInvites}
            pendingTeamInvites={pendingTeamInvites}
          />
        </div>

        {/* Right content */}
        <div className="space-y-6">
          {profile.dota2_account_id && (
            <Dota2StatsPanel accountId={profile.dota2_account_id} />
          )}
          {!profile.dota2_account_id && (
            <div className="rounded-2xl border border-gray-800/50 bg-[#121620] p-8 text-center">
              <p className="text-[10px] font-bold text-gray-600">
                Tournament history coming soon
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
