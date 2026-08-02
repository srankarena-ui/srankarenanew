import { NextRequest, NextResponse } from "next/server";
import { requireAuthedRequestFlexible } from "@/core/lib/require-auth";
import {
  fetchMasteryPoints,
  getAdminClient,
  recordCompletion,
  resolveRiotIdentity,
} from "@/core/lib/challenge-verify";
import {
  evaluateCondition,
  masteryChampion,
  parseCondition,
  type MatchFacts,
} from "@/core/lib/challenge-conditions";

interface ReportBody {
  challengeId?: unknown;
  gameId?: unknown;
  champion?: unknown;
  role?: unknown;
  queueId?: unknown;
}

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);

// Reporte en vivo del cliente de escritorio: "estoy jugando esta partida con
// este campeón/rol/cola". Lo que se puede corroborar contra Riot (maestría) lo
// resuelve el backend con su propia key; nada de eso se toma del cliente.
export async function POST(request: NextRequest) {
  const auth = await requireAuthedRequestFlexible(request, "challenges-report", 30, 60);
  if ("response" in auth) return auth.response;

  const body = (await request.json().catch(() => ({}))) as ReportBody;
  const { challengeId, gameId, champion, role, queueId } = body;

  if (typeof challengeId !== "string" || !challengeId) {
    return NextResponse.json({ error: "challengeId requerido" }, { status: 400 });
  }
  if (!isInt(gameId) || gameId <= 0) {
    return NextResponse.json({ error: "gameId inválido" }, { status: 400 });
  }
  if (champion !== undefined && typeof champion !== "string") {
    return NextResponse.json({ error: "champion inválido" }, { status: 400 });
  }
  if (queueId !== undefined && !isInt(queueId)) {
    return NextResponse.json({ error: "queueId inválido" }, { status: 400 });
  }
  if (role !== undefined && typeof role !== "string") {
    return NextResponse.json({ error: "role inválido" }, { status: 400 });
  }

  const admin = getAdminClient();

  // Solo se puede reportar un reto asignado a uno mismo.
  const { data: assignment } = await admin
    .from("challenge_assignments")
    .select("id, status")
    .eq("challenge_id", challengeId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!assignment) {
    return NextResponse.json({ error: "Reto no asignado" }, { status: 403 });
  }
  if (assignment.status !== "pending") {
    return NextResponse.json({ completed: true, reason: "ya_completado" });
  }

  const { data: challenge } = await admin
    .from("challenges")
    .select("id, conditions, is_active, starts_at, ends_at")
    .eq("id", challengeId)
    .single();

  if (!challenge?.is_active) {
    return NextResponse.json({ completed: false, reason: "reto_inactivo" });
  }

  const now = Date.now();
  if (challenge.starts_at && new Date(challenge.starts_at).getTime() > now) {
    return NextResponse.json({ completed: false, reason: "fuera_de_fecha" });
  }
  if (challenge.ends_at && new Date(challenge.ends_at).getTime() < now) {
    return NextResponse.json({ completed: false, reason: "fuera_de_fecha" });
  }

  const conditions = parseCondition(challenge.conditions);
  if (!conditions) {
    return NextResponse.json({ error: "El reto tiene condiciones inválidas" }, { status: 500 });
  }

  const facts: MatchFacts = { champion, role, queueId };
  let verified = false;

  const wantedChampion = masteryChampion(conditions);
  // Solo se consulta la maestría si el campeón en juego es el que pide el reto:
  // así una partida con otro campeón no gasta rate limit de la key personal.
  if (wantedChampion && champion === wantedChampion) {
    const apiKey = process.env.RIOT_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Riot API key no configurada" }, { status: 500 });
    }

    const identity = await resolveRiotIdentity(admin, auth.userId, apiKey);
    if (!identity) {
      return NextResponse.json({ error: "Cuenta de Riot no vinculada" }, { status: 400 });
    }

    const points = await fetchMasteryPoints(identity, wantedChampion, apiKey);
    // Un fallo de Riot no es "no cumple": se devuelve error para que el cliente
    // reintente en el próximo tick en vez de dar el reto por fallado.
    if (points === null) {
      return NextResponse.json({ error: "No se pudo consultar la maestría" }, { status: 502 });
    }

    facts.masteryPoints = points;
    verified = true;
  }

  if (!evaluateCondition(conditions, facts)) {
    return NextResponse.json({ completed: false, reason: "no_cumple" });
  }

  await recordCompletion(admin, {
    challengeId,
    userId: auth.userId,
    assignmentId: assignment.id,
    riotGameId: gameId,
    evidence: { ...facts },
    verified,
    source: "live",
  });

  return NextResponse.json({ completed: true });
}
