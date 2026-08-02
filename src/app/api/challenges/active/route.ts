import { NextRequest, NextResponse } from "next/server";
import { requireAuthedRequestFlexible } from "@/core/lib/require-auth";
import { getAdminClient } from "@/core/lib/challenge-verify";
import { parseCondition } from "@/core/lib/challenge-conditions";

// Retos pendientes del usuario. Lo consulta el cliente de escritorio al
// iniciar sesión para saber qué vigilar durante la partida.
export async function GET(request: NextRequest) {
  const auth = await requireAuthedRequestFlexible(request, "challenges-active");
  if ("response" in auth) return auth.response;

  const admin = getAdminClient();

  const { data: assignments } = await admin
    .from("challenge_assignments")
    .select("id, challenge_id")
    .eq("user_id", auth.userId)
    .eq("status", "pending");

  if (!assignments?.length) return NextResponse.json({ challenges: [] });

  const { data: challenges } = await admin
    .from("challenges")
    .select("id, title, description, conditions, tournament_id, starts_at, ends_at")
    .in("id", assignments.map((a) => a.challenge_id))
    .eq("is_active", true);

  const now = Date.now();
  const byId = new Map((challenges ?? []).map((c) => [c.id, c]));

  const active = assignments.flatMap((assignment) => {
    const challenge = byId.get(assignment.challenge_id);
    if (!challenge) return [];
    if (challenge.starts_at && new Date(challenge.starts_at).getTime() > now) return [];
    if (challenge.ends_at && new Date(challenge.ends_at).getTime() < now) return [];

    // Un reto con condiciones corruptas se omite en vez de mandarle basura al
    // cliente — el admin lo verá al no aparecer en la lista.
    const conditions = parseCondition(challenge.conditions);
    if (!conditions) return [];

    return [{
      assignmentId: assignment.id,
      challengeId: challenge.id,
      title: challenge.title,
      description: challenge.description,
      tournamentId: challenge.tournament_id,
      conditions,
    }];
  });

  return NextResponse.json({ challenges: active });
}
