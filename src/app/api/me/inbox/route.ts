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

  const [challenges, duos, teamInvites, participations, avisos] = await Promise.all([
    admin
      .from("challenge_assignments")
      .select("id, challenge_id, assigned_at, status")
      .eq("user_id", userId)
      // Aceptados tambien: es el que hay que cumplir. Los pendientes importan
      // por otro motivo — mientras no decida, sus partidas no cuentan — asi que
      // se manda el estado y el cliente redacta el aviso segun cual sea.
      .in("status", ["pending", "accepted"]),
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
    // Avisos persistentes. Distintos de `retos`: aquellos son lo que sigue
    // pendiente ahora, estos son lo que ha pasado y si lo has visto o no.
    admin
      .from("notifications")
      .select("id, type, title, body, link, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  // Retos: se resuelven sus definiciones y se descartan los caducados o con
  // condiciones corruptas, para no notificar algo que el jugador no puede cumplir.
  // `key` y `description` van para el cliente de escritorio: con solo el título
  // tendría que adivinar de qué castigo se trata comparando texto.
  const retos: Array<{
    id: string; challengeId: string; title: string; description: string | null;
    key: string | null; params: Record<string, unknown>; status: string; assignedAt: string;
  }> = [];
  const assignments = challenges.data ?? [];
  if (assignments.length) {
    const { data: defs } = await admin
      .from("challenges")
      .select("id, title, description, is_active, starts_at, ends_at, conditions")
      .in("id", assignments.map((a) => a.challenge_id));

    const byId = new Map((defs ?? []).map((d) => [d.id, d]));
    for (const a of assignments) {
      const def = byId.get(a.challenge_id);
      if (!def?.is_active) continue;
      if (def.starts_at && new Date(def.starts_at) > now) continue;
      if (def.ends_at && new Date(def.ends_at) < now) continue;
      const cond = parseCondition(def.conditions);
      if (!cond) continue;
      retos.push({
        id: a.id,
        challengeId: def.id,
        title: def.title,
        description: def.description,
        key: cond.type === "castigo" ? cond.key : null,
        // El campeón sorteado y los vetados: sin ellos el cliente no puede
        // avisar en selección, solo repetir el título.
        params: cond.type === "castigo" ? (cond.params ?? {}) : {},
        status: a.status,
        assignedAt: a.assigned_at,
      });
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

  const notificaciones = avisos.data ?? [];

  return NextResponse.json({
    retos,
    invitaciones,
    torneos,
    avisos: notificaciones,
    noLeidos: notificaciones.filter((a) => !a.read_at).length,
    total: retos.length + invitaciones.length,
  });
}

// Marcar avisos como leídos. Sin cuerpo marca todos; con `ids`, solo esos.
export async function POST(request: NextRequest) {
  const auth = await requireAuthedRequestFlexible(request, "me-inbox-read", 120, 60);
  if ("response" in auth) return auth.response;

  const { ids } = await request.json().catch(() => ({}));

  // Siempre acotado al usuario aunque vengan ids: sin el `eq`, cualquiera
  // podría marcar como leídos los avisos de otro pasando sus identificadores.
  let query = getAdminClient()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", auth.userId)
    .is("read_at", null);

  if (Array.isArray(ids) && ids.length) query = query.in("id", ids);

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
