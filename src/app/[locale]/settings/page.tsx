import { createClient } from "@/core/supabase/server";
import { redirect } from "next/navigation";
import { SettingsView } from "@/modules/settings/components/SettingsView";
import { getVerificationConfig } from "@/modules/admin/actions";
import { withResolvedClashRoyaleName } from "@/core/lib/clash-royale";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: riotVerificationChallenge } = await supabase
    .from("riot_verification_challenges")
    .select("*")
    .eq("user_id", user.id)
    .is("verified_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  const verificationConfig = await getVerificationConfig();
  const resolvedProfile = profile ? await withResolvedClashRoyaleName(profile) : profile;

  const { data: steamVerificationChallenge } = await supabase
    .from("steam_verification_challenges")
    .select("*")
    .eq("user_id", user.id)
    .is("verified_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  const { data: discordLinkChallenge } = await supabase
    .from("discord_link_challenges")
    .select("*")
    .eq("user_id", user.id)
    .is("verified_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <SettingsView
        profile={resolvedProfile!}
        riotVerificationChallenge={riotVerificationChallenge}
        verificationConfig={verificationConfig}
        steamVerificationChallenge={steamVerificationChallenge}
        discordLinkChallenge={discordLinkChallenge}
      />
    </div>
  );
}
