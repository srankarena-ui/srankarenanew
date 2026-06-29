import { createClient } from "@/core/supabase/server";
import { redirect } from "next/navigation";
import { EditTournamentWizard } from "@/modules/admin/components/EditTournamentWizard";

export default async function EditTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "organizador") redirect("/");

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (!tournament) redirect("/admin");

  const { data: games } = await supabase
    .from("games")
    .select("*")
    .order("name");

  // Vault items the picker can offer: those available + the ones already on this tournament.
  const { data: vaultRows } = await supabase
    .from("vault_items")
    .select("asset_id, name, icon_url, rarity, price_cents, status, tournament_id")
    .or(`status.eq.available,tournament_id.eq.${id}`)
    .order("price_cents", { ascending: false, nullsFirst: false });

  const vaultItems = (vaultRows ?? []).map(({ asset_id, name, icon_url, rarity, price_cents }) =>
    ({ asset_id, name, icon_url, rarity, price_cents }));
  const assignedIds = (vaultRows ?? []).filter(r => r.tournament_id === id).map(r => r.asset_id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <EditTournamentWizard
        tournament={tournament}
        games={games || []}
        vaultItems={vaultItems}
        assignedPrizeIds={assignedIds}
      />
    </div>
  );
}
