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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <EditTournamentWizard tournament={tournament} games={games || []} />
    </div>
  );
}
