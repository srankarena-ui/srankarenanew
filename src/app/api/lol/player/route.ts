import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, clientIp } from "@/core/lib/rate-limit";

// Map platform (na1, euw1, etc.) to regional cluster (americas, europe, asia, sea)
function getCluster(platform: string): string {
  const p = platform.toLowerCase();
  if (["na1", "br1", "la1", "la2"].includes(p)) return "americas";
  if (["euw1", "eun1", "tr1", "ru"].includes(p)) return "europe";
  if (["kr", "jp1"].includes(p)) return "asia";
  if (["oc1", "ph2", "sg2", "th2", "tw2", "vn2"].includes(p)) return "sea";
  return "americas";
}

export async function GET(request: NextRequest) {
  if (!(await checkRateLimit(`lol-player:${clientIp(request)}`, 30, 60))) return rateLimitResponse();

  const { searchParams } = request.nextUrl;
  const gameName = searchParams.get("gameName");
  const tagline = searchParams.get("tagline");
  const region = searchParams.get("region");

  if (!gameName || !tagline || !region) {
    return NextResponse.json({ error: "gameName, tagline, and region are required" }, { status: 400 });
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Riot API key not configured" }, { status: 500 });
  }

  const cluster = getCluster(region);

  try {
    // 1. Get PUUID from regional cluster
    const accountRes = await fetch(
      `https://${cluster}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagline)}`,
      { headers: { "X-Riot-Token": apiKey } }
    );
    if (!accountRes.ok) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    const account = await accountRes.json();

    // 2. Get summoner data from platform
    const summonerRes = await fetch(
      `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}`,
      { headers: { "X-Riot-Token": apiKey } }
    );
    const summoner = summonerRes.ok ? await summonerRes.json() : null;

    // 3. Get ranked data from platform (by puuid)
    let ranked: Record<string, unknown>[] = [];
    const rankedRes = await fetch(
      `https://${region}.api.riotgames.com/lol/league/v4/entries/by-puuid/${account.puuid}`,
      { headers: { "X-Riot-Token": apiKey } }
    );
    if (rankedRes.ok) {
      ranked = await rankedRes.json();
    }

    // 4. Get recent match IDs from cluster
    const matchIdsRes = await fetch(
      `https://${cluster}.api.riotgames.com/lol/match/v5/matches/by-puuid/${account.puuid}/ids?start=0&count=10`,
      { headers: { "X-Riot-Token": apiKey } }
    );
    const matchIds: string[] = matchIdsRes.ok ? await matchIdsRes.json() : [];

    // 5. Fetch match details (limit to 5 to avoid rate limits)
    const matches = [];
    for (const id of matchIds.slice(0, 5)) {
      const matchRes = await fetch(
        `https://${cluster}.api.riotgames.com/lol/match/v5/matches/${id}`,
        { headers: { "X-Riot-Token": apiKey } }
      );
      if (matchRes.ok) {
        const match = await matchRes.json();
        const player = match.info.participants.find(
          (p: Record<string, unknown>) => p.puuid === account.puuid
        );
        if (player) {
          matches.push({
            matchId: id,
            champion: player.championName,
            kills: player.kills,
            deaths: player.deaths,
            assists: player.assists,
            cs: player.totalMinionsKilled + player.neutralMinionsKilled,
            win: player.win,
            gameMode: match.info.gameMode,
            gameDuration: match.info.gameDuration,
            queueId: match.info.queueId,
            gameCreation: match.info.gameCreation,
          });
        }
      }
    }

    // Extract solo/duo and flex from ranked
    const soloQueue = ranked.find((r) => r.queueType === "RANKED_SOLO_5x5") as Record<string, unknown> | undefined;
    const flexQueue = ranked.find((r) => r.queueType === "RANKED_FLEX_SR") as Record<string, unknown> | undefined;

    return NextResponse.json({
      gameName: account.gameName,
      tagLine: account.tagLine,
      puuid: account.puuid,
      summonerLevel: summoner?.summonerLevel ?? 0,
      profileIconId: summoner?.profileIconId ?? 0,
      soloQueue: soloQueue
        ? {
            tier: soloQueue.tier,
            rank: soloQueue.rank,
            lp: soloQueue.leaguePoints,
            wins: soloQueue.wins,
            losses: soloQueue.losses,
          }
        : null,
      flexQueue: flexQueue
        ? {
            tier: flexQueue.tier,
            rank: flexQueue.rank,
            lp: flexQueue.leaguePoints,
            wins: flexQueue.wins,
            losses: flexQueue.losses,
          }
        : null,
      matches,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch player data" }, { status: 500 });
  }
}
