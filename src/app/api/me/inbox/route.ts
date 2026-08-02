import { NextRequest, NextResponse } from "next/server";
import { requireAuthedRequestFlexible } from "@/core/lib/require-auth";
import { getAdminClient } from "@/core/lib/challenge-verify";
import { parseCondition } from "@/core/lib/challenge-conditions";

// Todo lo que reclama la atención del jugador, en una sola llamada. Lo consulta
// el cliente de escritorio en cada sondeo para decidir si notifica.
//
// La plataforma no tenía ningún canal de avisos: el único envío existente es un
// correo manual que dispara un admin. Esto es el primero.
export async function GET(request: NextRequest) {
  const auth = await requireAuthedRequestFlexible(request, "me-inbox", 120, 60);
  if ("response" in auth) return auth.response;

  const admin = getAdminClient();
  const userId = auth.userId;
  const now = new Date();

  const [challenges, duos, teamInvites, participations] = await Promise.all([
    admin
      .from("challenge_assignments")
      .select("id, challenge_id, assigned_at")
      .eq("user_id", userId)
      .eq("status", "pending"),
    admin
      .from("player_duos")
      .select("id, requester_id, created_at")
      .eq("partner_id", userId)
      .eq("status", "pending"),
    admin
      .from("team_members")
      .select("id, team_id, invited_by, invited_at")
      .eq("user_id", userId)
      .eq("status", "pending"),
    admin
      .from("tournament_participants")
      .select("tournament_id")
      .eq("user_id", userId),
  ]);

  // Retos: se resuelven sus definiciones y se descartan los caducados o con
  // condiciones corruptas, para no notificar algo que el jugador no puede cumplir.
  const retos: Array<{ id: string; challengeId: string; title: string; assignedAt: string }> = [];
  const assignments = challenges.data ?? [];
  if (assignments.length) {
    const { data: defs } = await admin
      .from("challenges")
      .select("id, title, is_active, starts_at, ends_at, conditions")
      .in("id", assignments.map((a) => a.challenge_id));

    const byId = new Map((defs ?? []).map((d) => [d.id, d]));
    for (const a of assignments) {
      const def = byId.get(a.challenge_id);
      if (!def?.is_active) continue;
      if (def.starts_at && new Date(def.starts_at) > now) continue;
      if (def.ends_at && new Date(def.ends_at) < now) continue;
      if (!parseCondition(def.conditions)) continue;
      retos.push({ id: a.id, challengeId: def.id, title: def.title, assignedAt: a.assigned_at });
    }
  }

  // Torneos propios que empiezan en los próximos 7 días o ya están en marcha.
  const tournamentIds = (participations.data ?? []).map((p) => p.tournament_id);
  let torneos: Array<{ id: string; title: string; startDate: string | null; status: string }> = [];
  if (tournamentIds.length) {
    const limite = new Date(now.getTime() + 7 * 86400_000).toISOString().slice(0, 10);
    const { data } = await admin
      .from("tournaments")
      .select("id, title, start_date, status")
      .in("id", tournamentIds)
      .in("status", ["registration", "active"])
      .or(`start_date.is.null,start_date.lte.${limite}`)
      .order("start_date", { ascending: true });

    torneos = (data ?? []).map((t) => ({
      id: t.id, title: t.title, startDate: t.start_date, status: t.status,
    }));
  }

  // Nombres para las invitaciones: sin esto el aviso diría "alguien te invitó".
  const inviterIds = [
    ...(duos.data ?? []).map((d) => d.requester_id),
    ...(teamInvites.data ?? []).map((t) => t.invited_by),
  ].filter((id): id is string => Boolean(id));

  const nombres = new Map<string, string>();
  if (inviterIds.length) {
    const { data } = await admin
      .from("profiles")
      .select("id, username")
      .in("id", [...new Set(inviterIds)]);
    for (const p of data ?? []) nombres.set(p.id, p.username ?? "Alguien");
  }

  const invitaciones = [
    ...(duos.data ?? []).map((d) => ({
      id: d.id, tipo: "duo" as const,
      de: nombres.get(d.requester_id) ?? "Alguien",
      fecha: d.created_at,
    })),
    ...(teamInvites.data ?? []).map((t) => ({
      id: t.id, tipo: "equipo" as const,
      de: t.invited_by ? nombres.get(t.invited_by) ?? "Alguien" : "Alguien",
      fecha: t.invited_at,
    })),
  ];

  return NextResponse.json({
    retos,
    invitaciones,
    torneos,
    total: retos.length + invitaciones.length,
  });
}
