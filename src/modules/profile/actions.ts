"use server";

import { createClient } from "@/core/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DuoRow {
  id: string;
  requester_id: string;
  partner_id: string;
  status: "pending" | "accepted" | "rejected" | "disbanded";
  created_at: string;
  requester: { username: string | null } | null;
  partner: { username: string | null } | null;
}

export interface TeamRow {
  id: string;
  name: string;
  tag: string | null;
  created_by: string | null;
  created_at: string;
  members: {
    id: string;
    user_id: string;
    status: "pending" | "accepted" | "rejected";
    profile: { username: string | null } | null;
  }[];
}

type TeamMemberRow = TeamRow["members"][number] & { team_id: string };

// ─── Duo actions ──────────────────────────────────────────────────────────────

export async function inviteDuo(partnerUsername: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Look up partner by username
  const { data: partner } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", partnerUsername.trim())
    .single();
  if (!partner) return { error: "User not found" };
  if (partner.id === user.id) return { error: "You can't duo with yourself" };

  // Check max 2 active duos for requester
  const { data: myDuos } = await supabase
    .from("player_duos")
    .select("id")
    .or(`requester_id.eq.${user.id},partner_id.eq.${user.id}`)
    .eq("status", "accepted") as { data: { id: string }[] | null };
  if ((myDuos?.length ?? 0) >= 2) return { error: "You already have 2 active duos" };

  // Check partner's limit too
  const { data: partnerDuos } = await supabase
    .from("player_duos")
    .select("id")
    .or(`requester_id.eq.${partner.id},partner_id.eq.${partner.id}`)
    .eq("status", "accepted") as { data: { id: string }[] | null };
  if ((partnerDuos?.length ?? 0) >= 2) return { error: "That player already has 2 active duos" };

  // Check not already pending/accepted
  const { data: existing } = await supabase
    .from("player_duos")
    .select("id, status")
    .or(
      `and(requester_id.eq.${user.id},partner_id.eq.${partner.id}),and(requester_id.eq.${partner.id},partner_id.eq.${user.id})`
    )
    .in("status", ["pending", "accepted"])
    .maybeSingle() as { data: { id: string; status: string } | null };
  if (existing) return { error: existing.status === "accepted" ? "Already duos" : "Invite already pending" };

  const { error } = await supabase
    .from("player_duos")
    .insert({ requester_id: user.id, partner_id: partner.id });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

export async function respondDuoInvite(duoId: string, action: "accept" | "reject"): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const newStatus = action === "accept" ? "accepted" : "rejected";

  if (action === "accept") {
    // Re-check limit before accepting
    const { data: myDuos } = await supabase
      .from("player_duos")
      .select("id")
      .or(`requester_id.eq.${user.id},partner_id.eq.${user.id}`)
      .eq("status", "accepted") as { data: { id: string }[] | null };
    if ((myDuos?.length ?? 0) >= 2) return { error: "You already have 2 active duos" };
  }

  const { error } = await supabase
    .from("player_duos")
    .update({ status: newStatus })
    .eq("id", duoId)
    .eq("partner_id", user.id)
    .eq("status", "pending");
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

export async function disbandDuo(duoId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("player_duos")
    .update({ status: "disbanded" })
    .eq("id", duoId)
    .or(`requester_id.eq.${user.id},partner_id.eq.${user.id}`);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

// ─── Team actions ─────────────────────────────────────────────────────────────

export async function createTeam(name: string, tag: string): Promise<{ error?: string; teamId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!name.trim()) return { error: "Team name is required" };
  if (tag && tag.length > 5) return { error: "Tag must be 5 characters or less" };

  // Max 2 active teams
  const { data: myTeams } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .eq("status", "accepted") as { data: { team_id: string }[] | null };
  if ((myTeams?.length ?? 0) >= 2) return { error: "You are already in 2 teams" };

  const { data: team, error: teamErr } = await supabase
    .from("player_teams")
    .insert({ name: name.trim(), tag: tag.trim() || null, created_by: user.id })
    .select("id")
    .single() as { data: { id: string } | null; error: unknown };
  if (teamErr || !team) return { error: "Failed to create team" };

  // Add creator as accepted member
  await supabase
    .from("team_members")
    .insert({ team_id: team.id, user_id: user.id, status: "accepted", invited_by: user.id });

  revalidatePath("/", "layout");
  return { teamId: team.id };
}

export async function inviteTeamMember(teamId: string, username: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify caller is accepted member
  const { data: myMembership } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .eq("status", "accepted")
    .maybeSingle() as { data: { id: string } | null };
  if (!myMembership) return { error: "You are not a member of this team" };

  // Check team size (max 5)
  const { data: members } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("status", "accepted") as { data: { id: string }[] | null };
  if ((members?.length ?? 0) >= 5) return { error: "Team is full (max 5 members)" };

  const { data: invitee } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username.trim())
    .single();
  if (!invitee) return { error: "User not found" };

  // Check already a member
  const { data: existing } = await supabase
    .from("team_members")
    .select("id, status")
    .eq("team_id", teamId)
    .eq("user_id", invitee.id)
    .maybeSingle() as { data: { id: string; status: string } | null };
  if (existing) return { error: existing.status === "accepted" ? "Already a member" : "Invite already pending" };

  // Check invitee's team limit
  const { data: inviteeDuos } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", invitee.id)
    .eq("status", "accepted") as { data: { team_id: string }[] | null };
  if ((inviteeDuos?.length ?? 0) >= 2) return { error: "That player is already in 2 teams" };

  const { error } = await supabase
    .from("team_members")
    .insert({ team_id: teamId, user_id: invitee.id, invited_by: user.id });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

export async function respondTeamInvite(memberId: string, action: "accept" | "reject"): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const newStatus = action === "accept" ? "accepted" : "rejected";

  if (action === "accept") {
    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("id", memberId)
      .eq("user_id", user.id)
      .single() as { data: { team_id: string } | null };

    if (membership) {
      const { data: myTeams } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .eq("status", "accepted") as { data: { team_id: string }[] | null };
      if ((myTeams?.length ?? 0) >= 2) return { error: "You are already in 2 teams" };
    }
  }

  const { error } = await supabase
    .from("team_members")
    .update({ status: newStatus })
    .eq("id", memberId)
    .eq("user_id", user.id)
    .eq("status", "pending");
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

export async function leaveTeam(teamId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

export async function dissolveTeam(teamId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Only the creator can dissolve
  const { data: team } = await supabase
    .from("player_teams")
    .select("created_by")
    .eq("id", teamId)
    .single() as { data: { created_by: string | null } | null };
  if (!team || team.created_by !== user.id) return { error: "Only the team creator can dissolve the team" };

  const { error } = await supabase
    .from("player_teams")
    .delete()
    .eq("id", teamId);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

export async function getProfileDuosAndTeams(userId: string) {
  const supabase = await createClient();

  const [duosRes, myTeamMembersRes, pendingDuoInvitesRes, pendingTeamInvitesRes] = await Promise.all([
    // Active duos
    supabase
      .from("player_duos")
      .select("id, requester_id, partner_id, status, created_at, requester:profiles!player_duos_requester_id_fkey(username), partner:profiles!player_duos_partner_id_fkey(username)")
      .or(`requester_id.eq.${userId},partner_id.eq.${userId}`)
      .eq("status", "accepted") as unknown as Promise<{ data: DuoRow[] | null }>,

    // Teams the user is in (accepted) — step 1: get team IDs + team info
    supabase
      .from("team_members")
      .select("team_id, player_teams(id, name, tag, created_by, created_at)")
      .eq("user_id", userId)
      .eq("status", "accepted") as unknown as Promise<{ data: { team_id: string; player_teams: { id: string; name: string; tag: string | null; created_by: string | null; created_at: string } }[] | null }>,

    // Pending duo invites (I'm the partner)
    supabase
      .from("player_duos")
      .select("id, requester_id, partner_id, status, created_at, requester:profiles!player_duos_requester_id_fkey(username)")
      .eq("partner_id", userId)
      .eq("status", "pending") as unknown as Promise<{ data: DuoRow[] | null }>,

    // Pending team invites
    supabase
      .from("team_members")
      .select("id, team_id, status, player_teams(id, name, tag)")
      .eq("user_id", userId)
      .eq("status", "pending") as unknown as Promise<{ data: { id: string; team_id: string; status: string; player_teams: { id: string; name: string; tag: string | null } }[] | null }>,
  ]);

  // Step 2: for each team, fetch all members with their usernames
  const teamIds = (myTeamMembersRes.data ?? []).map((r) => r.team_id);
  let allTeamMembers: TeamMemberRow[] = [];

  if (teamIds.length > 0) {
    const { data: membersData } = await supabase
      .from("team_members")
      .select("id, team_id, user_id, status, profile:profiles!team_members_user_id_fkey(username)")
      .in("team_id", teamIds) as { data: TeamMemberRow[] | null };
    allTeamMembers = membersData ?? [];
  }

  // Build TeamRow objects
  const teams: TeamRow[] = (myTeamMembersRes.data ?? []).map((r) => ({
    ...r.player_teams,
    members: allTeamMembers.filter((m) => m.team_id === r.team_id),
  }));

  return {
    duos: duosRes.data ?? [],
    teams,
    pendingDuoInvites: pendingDuoInvitesRes.data ?? [],
    pendingTeamInvites: pendingTeamInvitesRes.data ?? [],
  };
}
