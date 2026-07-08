import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/core/lib/rate-limit";

function getCluster(platform: string): string {
  const p = platform.toLowerCase();
  if (["na1", "br1", "la1", "la2"].includes(p)) return "americas";
  if (["euw1", "eun1", "tr1", "ru"].includes(p)) return "europe";
  if (["kr", "jp1"].includes(p)) return "asia";
  return "sea";
}

type Participant = Record<string, unknown> & {
  challenges?: Record<string, number>;
};

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

type MatchSummary = {
  matchId: string;
  champion: string;
  win: boolean;
  gameDuration: number;
  queueId: number;
  gameCreation: number;
  wardsPlaced: number;
  controlWardsPlaced: number;
  wardsKilled: number;
  visionScore: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  pentaKills: number;
  quadraKills: number;
  tripleKills: number;
  doubleKills: number;
  firstBloodKill: boolean;
  largestMultiKill: number;
  largestKillingSpree: number;
  killParticipation: number;
  soloKills: number;
  totalDamageDealtToChampions: number;
  physicalDamageDealtToChampions: number;
  magicDamageDealtToChampions: number;
  trueDamageDealtToChampions: number;
  totalDamageTaken: number;
  totalHeal: number;
  totalHealsOnTeammates: number;
  damageSelfMitigated: number;
  goldEarned: number;
  goldSpent: number;
  cs: number;
  csPerMin: number;
  teamBaronKills: number;
  teamDragonKills: number;
  teamHeraldKills: number;
  teamGrubKills: number;
  teamTowerKills: number;
  dragonTakedowns: number;
  turretKills: number;
  turretTakedowns: number;
  inhibitorKills: number;
};

export async function GET(request: NextRequest) {
  if (!(await checkRateLimit(`lol-stats:${clientIp(request)}`, 30, 60))) return rateLimitResponse();

  const { searchParams } = request.nextUrl;
  const puuid = searchParams.get("puuid");
  const region = searchParams.get("region") ?? "na1";
  const count = Math.min(parseInt(searchParams.get("count") ?? "10"), 20);

  if (!puuid) return NextResponse.json({ error: "puuid required" }, { status: 400 });

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  const cluster = getCluster(region);

  try {
    const idsRes = await fetch(
      `https://${cluster}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`,
      { headers: { "X-Riot-Token": apiKey }, next: { revalidate: 300 } }
    );
    if (!idsRes.ok) return NextResponse.json({ error: "Could not fetch matches" }, { status: 502 });
    const matchIds: string[] = await idsRes.json();

    const matches: MatchSummary[] = [];
    for (const id of matchIds) {
      const matchRes = await fetch(
        `https://${cluster}.api.riotgames.com/lol/match/v5/matches/${id}`,
        { headers: { "X-Riot-Token": apiKey }, next: { revalidate: 3600 } }
      );
      if (!matchRes.ok) continue;
      const match = await matchRes.json();

      const player = match.info.participants.find((p: Participant) => p.puuid === puuid) as Participant | undefined;
      if (!player) continue;

      const team = (match.info.teams as Team[]).find((t) => t.teamId === player.teamId);
      const gameSecs: number = match.info.gameDuration;
      const gameMins = gameSecs / 60;
      const cs = ((player.totalMinionsKilled as number) ?? 0) + ((player.neutralMinionsKilled as number) ?? 0);
      const kills = (player.kills as number) ?? 0;
      const deaths = (player.deaths as number) ?? 0;
      const assists = (player.assists as number) ?? 0;
      const kda = deaths === 0 ? kills + assists : (kills + assists) / deaths;

      matches.push({
        matchId: id,
        champion: player.championName as string,
        win: player.win as boolean,
        gameDuration: gameSecs,
        queueId: match.info.queueId as number,
        gameCreation: match.info.gameCreation as number,
        // Vision
        wardsPlaced: (player.wardsPlaced as number) ?? 0,
        controlWardsPlaced: (player.visionWardsBoughtInGame as number) ?? 0,
        wardsKilled: (player.wardsKilled as number) ?? 0,
        visionScore: (player.visionScore as number) ?? 0,
        // Combat
        kills,
        deaths,
        assists,
        kda: parseFloat(kda.toFixed(2)),
        pentaKills: (player.pentaKills as number) ?? 0,
        quadraKills: (player.quadraKills as number) ?? 0,
        tripleKills: (player.tripleKills as number) ?? 0,
        doubleKills: (player.doubleKills as number) ?? 0,
        firstBloodKill: (player.firstBloodKill as boolean) ?? false,
        largestMultiKill: (player.largestMultiKill as number) ?? 0,
        largestKillingSpree: (player.largestKillingSpree as number) ?? 0,
        killParticipation: parseFloat((((player.challenges?.killParticipation) ?? 0) * 100).toFixed(1)),
        soloKills: player.challenges?.soloKills ?? 0,
        // Damage
        totalDamageDealtToChampions: (player.totalDamageDealtToChampions as number) ?? 0,
        physicalDamageDealtToChampions: (player.physicalDamageDealtToChampions as number) ?? 0,
        magicDamageDealtToChampions: (player.magicDamageDealtToChampions as number) ?? 0,
        trueDamageDealtToChampions: (player.trueDamageDealtToChampions as number) ?? 0,
        totalDamageTaken: (player.totalDamageTaken as number) ?? 0,
        totalHeal: (player.totalHeal as number) ?? 0,
        totalHealsOnTeammates: (player.totalHealsOnTeammates as number) ?? 0,
        damageSelfMitigated: (player.damageSelfMitigated as number) ?? 0,
        // Economy
        goldEarned: (player.goldEarned as number) ?? 0,
        goldSpent: (player.goldSpent as number) ?? 0,
        cs,
        csPerMin: gameMins > 0 ? parseFloat((cs / gameMins).toFixed(1)) : 0,
        // Objectives (team-level)
        teamBaronKills: team?.objectives?.baron?.kills ?? 0,
        teamDragonKills: team?.objectives?.dragon?.kills ?? 0,
        teamHeraldKills: team?.objectives?.riftHerald?.kills ?? 0,
        teamGrubKills: team?.objectives?.horde?.kills ?? 0,
        teamTowerKills: team?.objectives?.tower?.kills ?? 0,
        dragonTakedowns: player.challenges?.dragonTakedowns ?? 0,
        // Structures (personal)
        turretKills: (player.turretKills as number) ?? 0,
        turretTakedowns: (player.turretTakedowns as number) ?? 0,
        inhibitorKills: (player.inhibitorTakedowns as number) ?? 0,
      });
    }

    const n = matches.length;
    if (n === 0) return NextResponse.json({ matches: [], averages: null, totals: null, matchCount: 0 });

    type MatchKey = keyof MatchSummary;
    const avg = (key: MatchKey) => {
      const sum = matches.reduce((acc, m) => acc + (typeof m[key] === "number" ? (m[key] as number) : 0), 0);
      return parseFloat((sum / n).toFixed(2));
    };

    const averages = {
      wardsPlaced: avg("wardsPlaced"),
      controlWardsPlaced: avg("controlWardsPlaced"),
      wardsKilled: avg("wardsKilled"),
      visionScore: avg("visionScore"),
      kills: avg("kills"),
      deaths: avg("deaths"),
      assists: avg("assists"),
      kda: avg("kda"),
      killParticipation: avg("killParticipation"),
      totalDamageDealtToChampions: avg("totalDamageDealtToChampions"),
      totalDamageTaken: avg("totalDamageTaken"),
      totalHeal: avg("totalHeal"),
      goldEarned: avg("goldEarned"),
      cs: avg("cs"),
      csPerMin: avg("csPerMin"),
      teamBaronKills: avg("teamBaronKills"),
      teamDragonKills: avg("teamDragonKills"),
      teamHeraldKills: avg("teamHeraldKills"),
      teamGrubKills: avg("teamGrubKills"),
      teamTowerKills: avg("teamTowerKills"),
      turretKills: avg("turretKills"),
    };

    const totals = {
      wins: matches.filter((m) => m.win).length,
      losses: matches.filter((m) => !m.win).length,
      pentaKills: matches.reduce((a, m) => a + m.pentaKills, 0),
      quadraKills: matches.reduce((a, m) => a + m.quadraKills, 0),
      tripleKills: matches.reduce((a, m) => a + m.tripleKills, 0),
      firstBloods: matches.filter((m) => m.firstBloodKill).length,
    };

    return NextResponse.json({ matches, averages, totals, matchCount: n });
  } catch {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
