import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { TrialsConfig } from "@/core/types";

function getCluster(platform: string): string {
  const p = platform.toLowerCase();
  if (["na1", "br1", "la1", "la2"].includes(p)) return "americas";
  if (["euw1", "eun1", "tr1", "ru"].includes(p)) return "europe";
  if (["kr", "jp1"].includes(p)) return "asia";
  return "sea";
}

type Participant = Record<string, unknown> & { challenges?: Record<string, number> };
type Team = {
  teamId: number;
  objectives: {
    baron?: { kills: number };
    dragon?: { kills: number };
    riftHerald?: { kills: number };
    horde?: { kills: number };
    tower?: { kills: number };
  };
};

interface MatchStats {
  champion: string;
  win: boolean;
  gameDuration: number;
  queueId: number;
  gameCreation: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  killParticipation: number;
  visionScore: number;
  wardsPlaced: number;
  visionWardsBoughtInGame: number;
  wardsKilled: number;
  cs: number;
  csPerMin: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  totalHeal: number;
  goldEarned: number;
  teamBaronKills: number;
  teamDragonKills: number;
  teamHeraldKills: number;
  teamGrubKills: number;
  teamTowerKills: number;
  pentaKills: number;
  quadraKills: number;
  tripleKills: number;
  firstBloodKill: boolean;
}

function extractStats(player: Participant, matchInfo: Record<string, unknown>): MatchStats {
  const teams = matchInfo.teams as Team[];
  const team = teams.find((t) => t.teamId === (player.teamId as number));
  const gameSecs = (matchInfo.gameDuration as number) || 1;
  const gameMins = gameSecs / 60;
  const cs = ((player.totalMinionsKilled as number) ?? 0) + ((player.neutralMinionsKilled as number) ?? 0);
  const kills = (player.kills as number) ?? 0;
  const deaths = (player.deaths as number) ?? 0;
  const assists = (player.assists as number) ?? 0;
  const kda = deaths === 0 ? kills + assists : (kills + assists) / deaths;

  return {
    champion: player.championName as string,
    win: player.win as boolean,
    gameDuration: gameSecs,
    queueId: matchInfo.queueId as number,
    gameCreation: matchInfo.gameCreation as number,
    kills,
    deaths,
    assists,
    kda: parseFloat(kda.toFixed(2)),
    killParticipation: parseFloat((((player.challenges?.killParticipation) ?? 0) * 100).toFixed(1)),
    visionScore: (player.visionScore as number) ?? 0,
    wardsPlaced: (player.wardsPlaced as number) ?? 0,
    visionWardsBoughtInGame: (player.visionWardsBoughtInGame as number) ?? 0,
    wardsKilled: (player.wardsKilled as number) ?? 0,
    cs,
    csPerMin: gameMins > 0 ? parseFloat((cs / gameMins).toFixed(1)) : 0,
    totalDamageDealtToChampions: (player.totalDamageDealtToChampions as number) ?? 0,
    totalDamageTaken: (player.totalDamageTaken as number) ?? 0,
    totalHeal: (player.totalHeal as number) ?? 0,
    goldEarned: (player.goldEarned as number) ?? 0,
    teamBaronKills: team?.objectives?.baron?.kills ?? 0,
    teamDragonKills: team?.objectives?.dragon?.kills ?? 0,
    teamHeraldKills: team?.objectives?.riftHerald?.kills ?? 0,
    teamGrubKills: team?.objectives?.horde?.kills ?? 0,
    teamTowerKills: team?.objectives?.tower?.kills ?? 0,
    pentaKills: (player.pentaKills as number) ?? 0,
    quadraKills: (player.quadraKills as number) ?? 0,
    tripleKills: (player.tripleKills as number) ?? 0,
    firstBloodKill: (player.firstBloodKill as boolean) ?? false,
  };
}

function computeMatchScore(stats: MatchStats, w: TrialsConfig["scoring_weights"]): number {
  const objectives = stats.teamBaronKills + stats.teamDragonKills + stats.teamHeraldKills + stats.teamGrubKills;
  return (
    w.kda * stats.kda +
    w.kill_participation * (stats.killParticipation / 10) +
    w.vision_score * (stats.visionScore / 10) +
    w.cs_per_min * stats.csPerMin +
    w.damage * (stats.totalDamageDealtToChampions / 10000) +
    w.wards_placed * stats.wardsPlaced +
    w.objectives * objectives
  );
}

export async function POST(request: NextRequest) {
  // Auth check via regular client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "organizador"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tournamentId } = (await request.json()) as { tournamentId?: string };
  if (!tournamentId) return NextResponse.json({ error: "tournamentId required" }, { status: 400 });

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  // Use admin client to bypass RLS for writes
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: tournament } = await admin
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (!tournament || tournament.tournament_format !== "summoner_trials") {
    return NextResponse.json({ error: "Not a Summoner Trials tournament" }, { status: 400 });
  }

  const config = tournament.trials_config as TrialsConfig;
  const { matches_to_track, scoring_weights, match_type } = config;

  // Determine allowed queue IDs based on match_type
  // solo/duo → Ranked Solo/Duo (420)
  // flex     → Ranked Flex (440)
  // draft    → Normal Draft Pick (400)
  const allowedQueues: Record<string, number[]> = {
    solo:  [420],
    duo:   [420],
    flex:  [440],
    draft: [400],
  };
  const queues = allowedQueues[match_type] ?? [420];

  const { data: enrollments } = await admin
    .from("summoner_trials_enrollments")
    .select("*")
    .eq("tournament_id", tournamentId);

  if (!enrollments?.length) {
    return NextResponse.json({ synced: 0, message: "No enrollments" });
  }

  // Build a set of all enrolled PUUIDs for solo-mode enforcement
  const enrolledPuuids = new Set(enrollments.map((e) => e.puuid));

  let totalSynced = 0;
  const errors: string[] = [];

  for (const enrollment of enrollments) {
    if (enrollment.matches_tracked >= matches_to_track) continue;

    try {
      const cluster = getCluster(enrollment.region);
      const enrolledAtSec = Math.floor(new Date(enrollment.enrolled_at).getTime() / 1000);
      const remaining = matches_to_track - enrollment.matches_tracked;

      const idsRes = await fetch(
        `https://${cluster}.api.riotgames.com/lol/match/v5/matches/by-puuid/${enrollment.puuid}/ids?start=0&count=30&startTime=${enrolledAtSec}`,
        { headers: { "X-Riot-Token": apiKey } }
      );
      if (!idsRes.ok) { errors.push(`Failed IDs for ${enrollment.user_id}`); continue; }
      const allIds: string[] = await idsRes.json();

      const { data: existingMatches } = await admin
        .from("summoner_trials_matches")
        .select("riot_match_id")
        .eq("enrollment_id", enrollment.id);

      const trackedIds = new Set((existingMatches ?? []).map((m) => m.riot_match_id));
      const newIds = allIds.filter((id) => !trackedIds.has(id));
      if (!newIds.length) continue;

      let addedCount = 0;

      for (const matchId of newIds) {
        if (addedCount >= remaining) break;

        const matchRes = await fetch(
          `https://${cluster}.api.riotgames.com/lol/match/v5/matches/${matchId}`,
          { headers: { "X-Riot-Token": apiKey } }
        );
        if (!matchRes.ok) continue;
        const match = await matchRes.json();

        // Only track the configured match type
        if (!queues.includes(match.info?.queueId)) continue;

        // Solo enforcement: reject if another enrolled tournament player was on the same team
        if (match_type === "solo") {
          const participants: Participant[] = match.info.participants ?? [];
          const myTeamId = participants.find((p) => p.puuid === enrollment.puuid)?.teamId as number | undefined;
          const hasPremadeEnrolled = participants.some(
            (p) =>
              p.puuid !== enrollment.puuid &&
              p.teamId === myTeamId &&
              enrolledPuuids.has(p.puuid as string)
          );
          if (hasPremadeEnrolled) continue;
        }

        const participant = (match.info.participants as Participant[]).find(
          (p) => p.puuid === enrollment.puuid
        );
        if (!participant) continue;

        const stats = extractStats(participant, match.info as Record<string, unknown>);
        const matchScore = parseFloat(computeMatchScore(stats, scoring_weights).toFixed(2));

        const { error: insertErr } = await admin
          .from("summoner_trials_matches")
          .insert({
            enrollment_id: enrollment.id,
            tournament_id: tournamentId,
            riot_match_id: matchId,
            match_data: stats as unknown as Record<string, unknown>,
            game_creation: stats.gameCreation,
            match_score: matchScore,
          });

        if (!insertErr) {
          addedCount++;
          totalSynced++;
        }
      }

      if (addedCount > 0) {
        // Recompute aggregate from all stored matches
        const { data: allMatches } = await admin
          .from("summoner_trials_matches")
          .select("match_data, match_score")
          .eq("enrollment_id", enrollment.id);

        const allStats = (allMatches ?? []).map((m) => m.match_data as unknown as MatchStats);
        const n = allStats.length;
        const avg = (fn: (s: MatchStats) => number) =>
          n > 0 ? parseFloat((allStats.reduce((a, s) => a + fn(s), 0) / n).toFixed(2)) : 0;

        const statsSnapshot = {
          avg_kda: avg((s) => s.kda),
          avg_kill_participation: avg((s) => s.killParticipation),
          avg_vision_score: avg((s) => s.visionScore),
          avg_cs_per_min: avg((s) => s.csPerMin),
          avg_damage: avg((s) => s.totalDamageDealtToChampions),
          avg_wards_placed: avg((s) => s.wardsPlaced),
          avg_objectives: avg(
            (s) => s.teamBaronKills + s.teamDragonKills + s.teamHeraldKills + s.teamGrubKills
          ),
          wins: allStats.filter((s) => s.win).length,
          losses: allStats.filter((s) => !s.win).length,
        };

        const totalScore = parseFloat(
          ((allMatches ?? []).reduce((a, m) => a + Number(m.match_score), 0)).toFixed(2)
        );

        await admin
          .from("summoner_trials_enrollments")
          .update({ matches_tracked: n, score: totalScore, stats_snapshot: statsSnapshot })
          .eq("id", enrollment.id);
      }
    } catch (err) {
      errors.push(`Error for ${enrollment.user_id}: ${String(err)}`);
    }
  }

  // Recompute leaderboard ranks
  const { data: ranked } = await admin
    .from("summoner_trials_enrollments")
    .select("id, score")
    .eq("tournament_id", tournamentId)
    .order("score", { ascending: false });

  if (ranked) {
    for (let i = 0; i < ranked.length; i++) {
      await admin
        .from("summoner_trials_enrollments")
        .update({ leaderboard_rank: i + 1 })
        .eq("id", ranked[i].id);
    }
  }

  return NextResponse.json({ synced: totalSynced, errors });
}
