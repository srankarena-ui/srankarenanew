import { createClient } from "@/core/supabase/server";
import { notFound } from "next/navigation";
import { BracketOverlay } from "@/modules/tournaments/components/BracketOverlay";
import type { TournamentMatch, Profile } from "@/core/types";

type MatchWithPlayers = TournamentMatch & { player1: Profile | null; player2: Profile | null };

export const metadata = { robots: { index: false, follow: false } };

// Transparent, chrome-less bracket for OBS/Twitch browser-source capture.
// Lives outside [locale] and is excluded from the i18n middleware (src/proxy.ts)
// so it never gets redirected to a locale-prefixed path.
export default async function BracketOverlayPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (!tournament) notFound();

  const { data: matches } = await supabase
    .from("tournament_matches")
    .select("*, player1:profiles!tournament_matches_player1_id_fkey(*), player2:profiles!tournament_matches_player2_id_fkey(*)")
    .eq("tournament_id", tournamentId)
    .order("round_number")
    .order("match_number") as unknown as { data: MatchWithPlayers[] | null };

  return (
    <>
      <style>{`html, body { background: transparent !important; margin: 0; }`}</style>
      <BracketOverlay tournament={tournament} matches={matches ?? []} />
    </>
  );
}
