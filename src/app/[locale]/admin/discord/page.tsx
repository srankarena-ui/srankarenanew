import { createClient } from "@/core/supabase/server";
import { redirect } from "next/navigation";
import { DiscordSetupPanel } from "@/modules/admin/components/DiscordSetupPanel";

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <DiscordSetupPanel linkedCount={linkedCount ?? 0} />
    </div>
  );
}
