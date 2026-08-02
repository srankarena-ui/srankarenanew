import { NextResponse } from "next/server";
import { requireStaff } from "@/core/lib/require-auth";
import {
  fetchMasteryPoints,
  getAdminClient,
  recordCompletion,
  resolveRiotIdentity,
  type RiotIdentity,
} from "@/core/lib/challenge-verify";
import {
  evaluateCondition,
  isPostGameVerifiable,
  masteryChampion,
  parseCondition,
  type MatchFacts,
} from "@/core/lib/challenge-conditions";
import { getRiotCluster } from "@/core/lib/riot-regions";

// ponytail: 5 partidas por usuario y sin paralelismo, para no reventar el rate
// limit de la key personal (20 req/2s). Si esto se queda corto, subir el número
// y agregar espera entre lotes — o pedir production key a Riot.
const MATCHES_PER_USER = 5;

// Verificación post-partida: cubre los retos cuyas condiciones quedan
// registradas en el historial, aunque el cliente de escritorio no haya estado
// abierto. Las condiciones que solo existen en vivo las salta.
export async function POST() {
  const staff = await requireStaff();
  if ("response" in staff) return staff.response;

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Riot API key no configurada" }, { status: 500 });

  const admin = getAdminClient();

  const { data: assignments } = await admin
    .from("challenge_assignments")
    .select("id, challenge_id, user_id, assigned_at")
    .eq("status", "pending");

  if (!assignments?.length) return NextResponse.json({ completed: 0, checked: 0 });

  const { data: challenges } = await admin
    .from("challenges")
    .select("id, conditions, is_active, starts_at, ends_at")
    .in("id", assignments.map((a) => a.challenge_id))
    .eq("is_active", true);

  const byChallenge = new Map((challenges ?? []).map((c) => [c.id, c]));
  const now = Date.now();

  // Un usuario puede tener varios retos pendientes: se le pide el historial una
  // sola vez y se evalúan todos contra las mismas partidas.
  const byUser = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    const challenge = byChallenge.get(assignment.challenge_id);
    if (!challenge) continue;
    if (challenge.ends_at && new Date(challenge.ends_at).getTime() < now) continue;

    const conditions = parseCondition(challenge.conditions);
    if (!conditions || !isPostGameVerifiable(conditions)) continue;

    const list = byUser.get(assignment.user_id) ?? [];
    list.push(assignment);
    byUser.set(assignment.user_id, list);
  }

  let completed = 0;
  let checked = 0;

  for (const [userId, userAssignments] of byUser) {
    const identity = await resolveRiotIdentity(admin, userId, apiKey);
    if (!identity) continue;

    const matches = await fetchRecentMatches(identity, apiKey);
    checked += matches.length;
    if (!matches.length) continue;

    const masteryCache = new Map<string, number | null>();

    for (const assignment of userAssignments) {
      const challenge = byChallenge.get(assignment.challenge_id)!;
      const conditions = parseCondition(challenge.conditions)!;
      const wantedChampion = masteryChampion(conditions);
      // El reto solo cuenta desde que arrancó (o desde que se asignó).
      const since = new Date(challenge.starts_at ?? assignment.assigned_at).getTime();

      for (const match of matches) {
        if (match.playedAt < since) continue;

        const facts: MatchFacts = {
          champion: match.champion,
          role: match.role,
          queueId: match.queueId,
        };

        if (wantedChampion && match.champion === wantedChampion) {
          if (!masteryCache.has(wantedChampion)) {
            masteryCache.set(wantedChampion, await fetchMasteryPoints(identity, wantedChampion, apiKey));
          }
          const points = masteryCache.get(wantedChampion);
          if (points === null || points === undefined) continue;
          facts.masteryPoints = points;
        }

        if (!evaluateCondition(conditions, facts)) continue;

        await recordCompletion(admin, {
          challengeId: assignment.challenge_id,
          userId,
          assignmentId: assignment.id,
          riotGameId: match.gameId,
          evidence: { ...facts },
          verified: true,
          source: "match_history",
        });
        completed += 1;
        break;
      }
    }
  }

  return NextResponse.json({ completed, checked });
}

interface RecentMatch {
  gameId: number;
  champion: string;
  role: string;
  queueId: number;
  playedAt: number;
}

async function fetchRecentMatches(identity: RiotIdentity, apiKey: string): Promise<RecentMatch[]> {
  const cluster = getRiotCluster(identity.region);
  const listRes = await fetch(
    `https://${cluster}.api.riotgames.com/lol/match/v5/matches/by-puuid/${identity.puuid}/ids?start=0&count=${MATCHES_PER_USER}`,
    { headers: { "X-Riot-Token": apiKey } }
  );
  if (!listRes.ok) return [];

  const ids = (await listRes.json()) as string[];
  const matches: RecentMatch[] = [];

  for (const id of ids) {
    const res = await fetch(`https://${cluster}.api.riotgames.com/lol/match/v5/matches/${id}`, {
      headers: { "X-Riot-Token": apiKey },
    });
    if (!res.ok) continue;

    const data = await res.json();
    const me = data.info?.participants?.find((p: { puuid: string }) => p.puuid === identity.puuid);
    if (!me) continue;

    matches.push({
      gameId: data.info.gameId,
      champion: me.championName,
      role: me.teamPosition || me.individualPosition || "",
      queueId: data.info.queueId,
      playedAt: data.info.gameStartTimestamp ?? data.info.gameCreation ?? 0,
    });
  }

  return matches;
}
