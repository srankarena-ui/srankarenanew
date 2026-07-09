import { createClient } from "@/core/supabase/server";
import { redirect } from "next/navigation";
import { DiscordSetupPanel } from "@/modules/admin/components/DiscordSetupPanel";
import { getRegisteredCommands, getGuildStatus } from "@/core/lib/discord";

export default async function AdminDiscordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { count: linkedCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not("discord_id", "is", null);

  const envStatus = {
    DISCORD_PUBLIC_KEY: !!process.env.DISCORD_PUBLIC_KEY,
    DISCORD_APPLICATION_ID: !!process.env.DISCORD_APPLICATION_ID,
    DISCORD_BOT_TOKEN: !!process.env.DISCORD_BOT_TOKEN,
    DISCORD_GUILD_ID: !!process.env.DISCORD_GUILD_ID,
    DISCORD_VERIFIED_ROLE_ID: !!process.env.DISCORD_VERIFIED_ROLE_ID,
  };
  const [commandsResult, guildResult] = await Promise.all([getRegisteredCommands(), getGuildStatus()]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <DiscordSetupPanel
        linkedCount={linkedCount ?? 0}
        envStatus={envStatus}
        commandsResult={commandsResult}
        guildResult={guildResult}
      />
    </div>
  );
}
