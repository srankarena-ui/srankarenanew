import { createClient } from "@/core/supabase/server";
import { TournamentList } from "@/modules/tournaments/components/TournamentList";
import { ACTIVE_GAMES } from "@/core/config/games";

export default async function TournamentsPage() {
  const supabase = await createClient();

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*, tournament_participants(count)")
    .neq("status", "draft")
    .in("game", ACTIVE_GAMES)
    .order("created_at", { ascending: false });

  const tournamentsWithCount = (tournaments || []).map((t) => ({
    ...t,
    participant_count: (t.tournament_participants as unknown as { count: number }[])?.[0]?.count || 0,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <TournamentList tournaments={tournamentsWithCount} />
    </div>
  );
}
