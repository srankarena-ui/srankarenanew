import { createClient } from "@/core/supabase/server";
import { redirect } from "next/navigation";
import { SettingsView } from "@/modules/settings/components/SettingsView";
import { getVerificationConfig } from "@/modules/admin/actions";
import { withResolvedClashRoyaleName } from "@/core/lib/clash-royale";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Los tres retos de verificación y la config no dependen entre sí: se piden
  // a la vez en vez de encadenar cinco esperas contra Supabase.
  const ahora = new Date().toISOString();
  const pendiente = (tabla: string) =>
    supabase
      .from(tabla)
      .select("*")
      .eq("user_id", user.id)
      .is("verified_at", null)
      .gt("expires_at", ahora)
      .maybeSingle();

  const [
    { data: profile },
    { data: riotVerificationChallenge },
    verificationConfig,
    { data: steamVerificationChallenge },
    { data: discordLinkChallenge },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    pendiente("riot_verification_challenges"),
    getVerificationConfig(),
    pendiente("steam_verification_challenges"),
    pendiente("discord_link_challenges"),
  ]);

  // Este sí depende del perfil, así que va después.
  const resolvedProfile = profile ? await withResolvedClashRoyaleName(profile) : profile;

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
