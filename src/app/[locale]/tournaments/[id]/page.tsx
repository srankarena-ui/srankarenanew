import { createClient } from "@/core/supabase/server";
import { notFound } from "next/navigation";
import { TournamentDetail } from "@/modules/tournaments/components/TournamentDetail";
import type { TournamentParticipant, TournamentMatch, Profile, TrialsEnrollmentWithProfile } from "@/core/types";

type ParticipantWithProfile = TournamentParticipant & { profile: Profile };
type MatchWithPlayers = TournamentMatch & { player1: Profile | null; player2: Profile | null };

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (!tournament) notFound();

  const { data: participants } = await supabase
    .from("tournament_participants")
    .select("*, profile:profiles(*)")
    .eq("tournament_id", id) as unknown as { data: ParticipantWithProfile[] | null };

  const { data: matches } = await supabase
    .from("tournament_matches")
    .select("*, player1:profiles!tournament_matches_player1_id_fkey(*), player2:profiles!tournament_matches_player2_id_fkey(*)")
    .eq("tournament_id", id)
    .order("round_number")
    .order("match_number") as unknown as { data: MatchWithPlayers[] | null };

  const { data: { user } } = await supabase.auth.getUser();

  const isRegistered = user
    ? (participants || []).some((p) => p.user_id === user.id)
    : false;

  const userProfile = user
    ? (await supabase.from("profiles").select("*").eq("id", user.id).single()).data
    : null;

  // Fetch Summoner Trials enrollments if applicable; also team reg count for team-based brackets
  let trialsEnrollments: TrialsEnrollmentWithProfile[] | undefined;
  let teamRegistrationCount = 0;
  const isSummonerTrials = tournament.tournament_format === "summoner_trials";
  const isBracketTeamBased = !isSummonerTrials && (tournament.team_size === 2 || tournament.team_size === 5);

  if (isSummonerTrials) {
    const [enrollRes, teamRegRes] = await Promise.all([
      supabase
        .from("summoner_trials_enrollments")
        .select("*, profile:profiles(*)")
        .eq("tournament_id", id)
        .order("score", { ascending: false }) as unknown as Promise<{
          data: TrialsEnrollmentWithProfile[] | null;
        }>,
      supabase
        .from("tournament_team_registrations")
        .select("id", { count: "exact" })
        .eq("tournament_id", id) as unknown as Promise<{ count: number | null }>,
    ]);
    trialsEnrollments = enrollRes.data ?? [];
    teamRegistrationCount = teamRegRes.count ?? 0;
  } else if (isBracketTeamBased) {
    const { count } = await supabase
      .from("tournament_team_registrations")
      .select("id", { count: "exact" })
      .eq("tournament_id", id) as unknown as { count: number | null };
    teamRegistrationCount = count ?? 0;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <TournamentDetail
        tournament={tournament}
        participants={participants || []}
        matches={matches || []}
        currentUserId={user?.id || null}
        isRegistered={isRegistered}
        isAdmin={userProfile?.role === "admin" || userProfile?.role === "organizador"}
        trialsEnrollments={trialsEnrollments}
        teamRegistrationCount={teamRegistrationCount}
      />
    </div>
  );
}
