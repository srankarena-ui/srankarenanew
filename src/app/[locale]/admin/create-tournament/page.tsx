import { createClient } from "@/core/supabase/server";
import { redirect } from "next/navigation";
import { CreateTournamentWizard } from "@/modules/admin/components/CreateTournamentWizard";

export default async function CreateTournamentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "organizador") redirect("/");

  const { data: games } = await supabase
    .from("games")
    .select("*")
    .order("name");

  // Available vault items (Dota 2 prizes) the wizard can assign.
  const { data: vaultItems } = await supabase
    .from("vault_items")
    .select("asset_id, name, icon_url, rarity, price_cents")
    .eq("status", "available")
    .order("price_cents", { ascending: false, nullsFirst: false });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <CreateTournamentWizard games={games || []} vaultItems={vaultItems || []} />
    </div>
  );
}
