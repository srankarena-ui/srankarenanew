"use server";

import { createClient } from "@/core/supabase/server";
import { revalidatePath } from "next/cache";
import type { TrialsConfig } from "@/core/types";

// ─── Types for team-based registration ────────────────────────────────────────

export interface UserDuoOption {
  id: string;
  partner_username: string;
  partner_id: string;
}

export interface UserTeamOption {
  id: string;
  name: string;
  tag: string | null;
  member_count: number;
}

export interface TeamRegistration {
  id: string;
  duo_id: string | null;
  team_id: string | null;
  registered_by: string | null;
  registered_at: string;
  duo?: { player_duos_requester: { username: string | null } | null; player_duos_partner: { username: string | null } | null } | null;
  team?: { id: string; name: string; tag: string | null } | null;
}

// ─── Fetch eligible duos/teams for the current user ───────────────────────────

export async function getUserDuosAndTeamsForTournament(tournamentId: string): Promise<{
  duos: UserDuoOption[];
  teams: UserTeamOption[];
  registeredDuoId: string | null;
  registeredTeamId: string | null;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { duos: [], teams: [], registeredDuoId: null, registeredTeamId: null };

  const [duosRes, teamMembersRes, existingRegRes] = await Promise.all([
    supabase
      .from("player_duos")
      .select("id, requester_id, partner_id, requester:profiles!player_duos_requester_id_fkey(username), partner:profiles!player_duos_partner_id_fkey(username)")
      .or(`requester_id.eq.${user.id},partner_id.eq.${user.id}`)
      .eq("status", "accepted") as unknown as Promise<{ data: { id: string; requester_id: string; partner_id: string; requester: { username: string | null } | null; partner: { username: string | null } | null }[] | null }>,

    supabase
      .from("team_members")
      .select("team_id, player_teams(id, name, tag)")
      .eq("user_id", user.id)
      .eq("status", "accepted") as unknown as Promise<{ data: { team_id: string; player_teams: { id: string; name: string; tag: string | null } }[] | null }>,

    supabase
      .from("tournament_team_registrations")
      .select("duo_id, team_id")
      .eq("tournament_id", tournamentId)
      .or(`registered_by.eq.${user.id}`) as unknown as Promise<{ data: { duo_id: string | null; team_id: string | null }[] | null }>,
  ]);

  const duos: UserDuoOption[] = (duosRes.data ?? []).map((d) => ({
    id: d.id,
    partner_id: d.requester_id === user.id ? d.partner_id : d.requester_id,
    partner_username:
      d.requester_id === user.id
        ? (d.partner?.username ?? "Unknown")
        : (d.requester?.username ?? "Unknown"),
  }));

  // Get member counts for teams
  const teamIds = (teamMembersRes.data ?? []).map((r) => r.team_id);
  let memberCounts: Record<string, number> = {};
  if (teamIds.length > 0) {
    const { data: counts } = await supabase
      .from("team_members")
      .select("team_id")
      .in("team_id", teamIds)
      .eq("status", "accepted") as { data: { team_id: string }[] | null };
    for (const row of counts ?? []) {
      memberCounts[row.team_id] = (memberCounts[row.team_id] ?? 0) + 1;
    }
  }

  const teams: UserTeamOption[] = (teamMembersRes.data ?? []).map((r) => ({
    id: r.player_teams.id,
    name: r.player_teams.name,
    tag: r.player_teams.tag,
    member_count: memberCounts[r.team_id] ?? 1,
  }));

  // Check if user already has a registration (via any of their duos/teams)
  const myDuoIds = new Set(duos.map((d) => d.id));
  const myTeamIds = new Set(teams.map((t) => t.id));
  const regs = existingRegRes.data ?? [];

  // Also check all tournament_team_registrations for this tournament matching our duo/team IDs
  const { data: allRegs } = await supabase
    .from("tournament_team_registrations")
    .select("duo_id, team_id")
    .eq("tournament_id", tournamentId) as { data: { duo_id: string | null; team_id: string | null }[] | null };

  let registeredDuoId: string | null = null;
  let registeredTeamId: string | null = null;
  for (const reg of allRegs ?? []) {
    if (reg.duo_id && myDuoIds.has(reg.duo_id)) registeredDuoId = reg.duo_id;
    if (reg.team_id && myTeamIds.has(reg.team_id)) registeredTeamId = reg.team_id;
  }

  return { duos, teams, registeredDuoId, registeredTeamId };
}

// ─── Register a team/duo for a tournament ─────────────────────────────────────

export async function registerTeamForTournament(
  tournamentId: string,
  opts: { duoId?: string; teamId?: string }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!opts.duoId && !opts.teamId) return { error: "No team or duo selected" };

  // Fetch tournament config
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("max_participants, trials_config, tournament_format, status, team_size")
    .eq("id", tournamentId)
    .single() as { data: { max_participants: number; trials_config: unknown; tournament_format: string; status: string; team_size: number | null } | null };

  if (!tournament) return { error: "Tournament not found" };

  // team-based registration is valid for summoner_trials AND bracket tournaments with team_size > 1
  const isSummonerTrials = tournament.tournament_format === "summoner_trials";
  const teamSize = tournament.team_size ?? 1;
  if (!isSummonerTrials && teamSize === 1) return { error: "This tournament uses individual registrations" };

  // Count current team registrations
  const { data: currentRegs } = await supabase
    .from("tournament_team_registrations")
    .select("id")
    .eq("tournament_id", tournamentId) as { data: { id: string }[] | null };

  if ((currentRegs?.length ?? 0) >= tournament.max_participants) {
    return { error: "Tournament is full" };
  }

  const config = tournament.trials_config as TrialsConfig | null;
  const queueType = config?.match_type ?? "solo";

  if (opts.duoId) {
    // For summoner_trials: only "duo" queue type supports duos
    if (isSummonerTrials && queueType !== "duo") return { error: "This tournament requires a team registration, not a duo" };
    // For brackets: only team_size=2 supports duos
    if (!isSummonerTrials && teamSize !== 2) return { error: "This tournament requires a team registration, not a duo" };

    // Verify user is in this duo
    const { data: duo } = await supabase
      .from("player_duos")
      .select("id, requester_id, partner_id")
      .eq("id", opts.duoId)
      .eq("status", "accepted")
      .single() as { data: { id: string; requester_id: string; partner_id: string } | null };

    if (!duo) return { error: "Duo not found or not active" };
    if (duo.requester_id !== user.id && duo.partner_id !== user.id) return { error: "You are not in this duo" };

    if (isSummonerTrials) {
      // Add both players as individual tournament_participants + summoner_trials_enrollments
      const playerIds = [duo.requester_id, duo.partner_id];
      for (const playerId of playerIds) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("riot_puuid, lol_region")
          .eq("id", playerId)
          .single();

        if (!profile?.riot_puuid) {
          return { error: `One or both duo members don't have a linked Riot account` };
        }

        await supabase
          .from("tournament_participants")
          .upsert({ tournament_id: tournamentId, user_id: playerId });

        await supabase
          .from("summoner_trials_enrollments")
          .upsert({
            tournament_id: tournamentId,
            user_id: playerId,
            puuid: profile.riot_puuid,
            region: profile.lol_region ?? "na1",
          });
      }
    } else {
      // Bracket 2v2: only registered_by goes in as team representative
      await supabase
        .from("tournament_participants")
        .upsert({ tournament_id: tournamentId, user_id: user.id });
    }

    const { error } = await supabase
      .from("tournament_team_registrations")
      .insert({ tournament_id: tournamentId, duo_id: opts.duoId, registered_by: user.id });

    if (error) return { error: (error as { message: string }).message };

  } else if (opts.teamId) {
    // For summoner_trials: only "flex" queue type supports teams
    if (isSummonerTrials && queueType !== "flex") return { error: "This tournament requires a duo registration, not a team" };
    // For brackets: only team_size=5 supports teams
    if (!isSummonerTrials && teamSize !== 5) return { error: "This tournament requires a duo registration, not a team" };

    // Verify user is accepted member
    const { data: membership } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", opts.teamId)
      .eq("user_id", user.id)
      .eq("status", "accepted")
      .maybeSingle() as { data: { id: string } | null };

    if (!membership) return { error: "You are not an accepted member of this team" };

    if (isSummonerTrials) {
      // Get all accepted members and enroll each
      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", opts.teamId)
        .eq("status", "accepted") as { data: { user_id: string }[] | null };

      for (const m of members ?? []) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("riot_puuid, lol_region")
          .eq("id", m.user_id)
          .single();

        if (!profile?.riot_puuid) {
          return { error: `One or more team members don't have a linked Riot account` };
        }

        await supabase
          .from("tournament_participants")
          .upsert({ tournament_id: tournamentId, user_id: m.user_id });

        await supabase
          .from("summoner_trials_enrollments")
          .upsert({
            tournament_id: tournamentId,
            user_id: m.user_id,
            puuid: profile.riot_puuid,
            region: profile.lol_region ?? "na1",
          });
      }
    } else {
      // Bracket 5v5: only registered_by goes in as team representative
      await supabase
        .from("tournament_participants")
        .upsert({ tournament_id: tournamentId, user_id: user.id });
    }

    const { error } = await supabase
      .from("tournament_team_registrations")
      .insert({ tournament_id: tournamentId, team_id: opts.teamId, registered_by: user.id });

    if (error) return { error: (error as { message: string }).message };
  }

  revalidatePath(`/tournaments/${tournamentId}`);
  return {};
}

// ─── Unregister a team/duo ────────────────────────────────────────────────────

export async function unregisterTeamFromTournament(
  tournamentId: string,
  opts: { duoId?: string; teamId?: string }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Get the registration
  let query = supabase
    .from("tournament_team_registrations")
    .select("id, duo_id, team_id")
    .eq("tournament_id", tournamentId);

  if (opts.duoId) query = query.eq("duo_id", opts.duoId);
  if (opts.teamId) query = query.eq("team_id", opts.teamId);

  const { data: reg } = await query.single() as { data: { id: string; duo_id: string | null; team_id: string | null } | null };
  if (!reg) return { error: "Registration not found" };

  // Delete team registration row
  await supabase
    .from("tournament_team_registrations")
    .delete()
    .eq("id", reg.id);

  // Remove all member participants
  if (reg.duo_id) {
    const { data: duo } = await supabase
      .from("player_duos")
      .select("requester_id, partner_id")
      .eq("id", reg.duo_id)
      .single() as { data: { requester_id: string; partner_id: string } | null };

    if (duo) {
      await supabase
        .from("tournament_participants")
        .delete()
        .eq("tournament_id", tournamentId)
        .in("user_id", [duo.requester_id, duo.partner_id]);
    }
  } else if (reg.team_id) {
    const { data: members } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", reg.team_id)
      .eq("status", "accepted") as { data: { user_id: string }[] | null };

    if (members && members.length > 0) {
      await supabase
        .from("tournament_participants")
        .delete()
        .eq("tournament_id", tournamentId)
        .in("user_id", members.map((m) => m.user_id));
    }
  }

  revalidatePath(`/tournaments/${tournamentId}`);
  return {};
}

// ─── Fetch team registrations for a tournament ────────────────────────────────

export async function getTournamentTeamRegistrations(tournamentId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tournament_team_registrations")
    .select("id, duo_id, team_id, registered_by, registered_at")
    .eq("tournament_id", tournamentId)
    .order("registered_at") as { data: { id: string; duo_id: string | null; team_id: string | null; registered_by: string | null; registered_at: string }[] | null };

  if (!data || data.length === 0) return [];

  // Enrich with names
  const duoIds = data.filter((r) => r.duo_id).map((r) => r.duo_id!);
  const teamIds = data.filter((r) => r.team_id).map((r) => r.team_id!);

  const [duosRes, teamsRes] = await Promise.all([
    duoIds.length > 0
      ? supabase
          .from("player_duos")
          .select("id, requester_id, partner_id, requester:profiles!player_duos_requester_id_fkey(username), partner:profiles!player_duos_partner_id_fkey(username)")
          .in("id", duoIds) as unknown as Promise<{ data: { id: string; requester: { username: string | null } | null; partner: { username: string | null } | null }[] | null }>
      : Promise.resolve({ data: [] as { id: string; requester: { username: string | null } | null; partner: { username: string | null } | null }[] }),

    teamIds.length > 0
      ? supabase
          .from("player_teams")
          .select("id, name, tag")
          .in("id", teamIds) as unknown as Promise<{ data: { id: string; name: string; tag: string | null }[] | null }>
      : Promise.resolve({ data: [] as { id: string; name: string; tag: string | null }[] }),
  ]);

  const duoMap = Object.fromEntries((duosRes.data ?? []).map((d) => [d.id, d]));
  const teamMap = Object.fromEntries((teamsRes.data ?? []).map((t) => [t.id, t]));

  return data.map((reg) => ({
    ...reg,
    duo: reg.duo_id ? duoMap[reg.duo_id] ?? null : null,
    team: reg.team_id ? teamMap[reg.team_id] ?? null : null,
  }));
}

// ─── Register the current user for a tournament (individual) ──────────────────

export async function registerForTournament(tournamentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Check if Summoner Trials format
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("tournament_format")
    .eq("id", tournamentId)
    .single();

  if (tournament?.tournament_format === "summoner_trials") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("riot_puuid, lol_region")
      .eq("id", user.id)
      .single();

    if (!profile?.riot_puuid) {
      return { error: "You need a linked Riot account to join Summoner Trials. Go to Settings → Link Riot ID." };
    }

    const { error: partError } = await supabase
      .from("tournament_participants")
      .insert({ tournament_id: tournamentId, user_id: user.id });
    if (partError) return { error: partError.message };

    const { error: enrollError } = await supabase
      .from("summoner_trials_enrollments")
      .insert({
        tournament_id: tournamentId,
        user_id: user.id,
        puuid: profile.riot_puuid,
        region: profile.lol_region ?? "na1",
      });

    if (enrollError && !enrollError.message.includes("duplicate")) {
      return { error: enrollError.message };
    }
  } else {
    const { error } = await supabase
      .from("tournament_participants")
      .insert({ tournament_id: tournamentId, user_id: user.id });
    if (error) return { error: error.message };
  }

  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true };
}

export async function unregisterFromTournament(tournamentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tournament_participants")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true };
}

export async function generateBracket(tournamentId: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("generate_bracket", {
    p_tournament_id: tournamentId,
  });

  if (error) return { error: error.message };

  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true };
}

export async function submitScore(
  matchId: string,
  player1Score: number,
  player2Score: number
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tournament_matches")
    .update({
      player1_score: player1Score,
      player2_score: player2Score,
      status: "in_progress",
    })
    .eq("id", matchId);

  if (error) return { error: error.message };

  return { success: true };
}

export async function advanceWinner(matchId: string, winnerId: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("advance_winner", {
    p_match_id: matchId,
    p_winner_id: winnerId,
  });

  if (error) return { error: error.message };

  revalidatePath("/tournaments");
  return { success: true };
}
