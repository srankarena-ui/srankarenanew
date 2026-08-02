import type { Metadata } from "next";
import { createClient } from "@/core/supabase/server";
import { notFound } from "next/navigation";
import { TournamentDetail } from "@/modules/tournaments/components/TournamentDetail";
import { pageMetadata } from "@/core/lib/seo";
import type { TournamentParticipant, TournamentMatch, Profile, TrialsEnrollmentWithProfile } from "@/core/types";

type ParticipantWithProfile = TournamentParticipant & { profile: Profile };
type MatchWithPlayers = TournamentMatch & { player1: Profile | null; player2: Profile | null };

// Cada torneo con su propio título y descripción: son las páginas con más
// posibilidades de posicionar, y hasta ahora todas compartían el título del sitio.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const supabase = await createClient();
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("title, game, mode, prizes, start_date, max_participants")
    .eq("id", id)
    .single();

  if (!tournament) return {};

  const es = locale === "es";
  const date = tournament.start_date
    ? new Date(tournament.start_date).toLocaleDateString(es ? "es-ES" : "en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const parts = [
    tournament.game,
    tournament.mode,
    date && (es ? `Comienza el ${date}` : `Starts ${date}`),
    tournament.max_participants && (es ? `${tournament.max_participants} plazas` : `${tournament.max_participants} slots`),
  ].filter(Boolean);

  return pageMetadata({
    locale,
    path: `/tournaments/${id}`,
    title: tournament.title,
    description: es
      ? `${parts.join(" · ")}. Inscripción, bracket en vivo y resultados en S-Rank Arena.`
      : `${parts.join(" · ")}. Registration, live bracket and results on S-Rank Arena.`,
  });
}

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

  // Nada de esto depende de lo anterior: en serie eran cuatro esperas
  // encadenadas contra Supabase.
  const [participantsRes, matchesRes, userRes, prizeRes] = await Promise.all([
    supabase
      .from("tournament_participants")
      .select("*, profile:profiles(*)")
      .eq("tournament_id", id),
    supabase
      .from("tournament_matches")
      .select("*, player1:profiles!tournament_matches_player1_id_fkey(*), player2:profiles!tournament_matches_player2_id_fkey(*)")
      .eq("tournament_id", id)
      .order("round_number")
      .order("match_number"),
    supabase.auth.getUser(),
    // Objetos del vault asignados como premio de este torneo.
    supabase
      .from("vault_items")
      .select("asset_id, name, icon_url, rarity, price_cents")
      .eq("tournament_id", id)
      .order("price_cents", { ascending: false, nullsFirst: false }),
  ]);

  const participants = participantsRes.data as unknown as ParticipantWithProfile[] | null;
  const matches = matchesRes.data as unknown as MatchWithPlayers[] | null;
  const user = userRes.data.user;
  const prizeItems = prizeRes.data;

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
        prizeItems={prizeItems || []}
      />
    </div>
  );
}
