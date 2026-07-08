import { NextRequest, NextResponse } from "next/server";
import { requireAuthedRequest } from "@/core/lib/require-auth";

export async function POST(request: NextRequest) {
  const authError = await requireAuthedRequest();
  if (authError) return authError;

  const { gameName, tagline, region } = await request.json();

  if (!gameName || !tagline) {
    return NextResponse.json({ error: "gameName and tagline are required" }, { status: 400 });
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Riot API key not configured" }, { status: 500 });
  }

  // Step 1: Get PUUID from Riot Account API
  const accountUrl = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagline)}`;

  const accountRes = await fetch(accountUrl, {
    headers: { "X-Riot-Token": apiKey },
  });

  if (!accountRes.ok) {
    if (accountRes.status === 404) {
      return NextResponse.json({ error: "Riot account not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Riot API error" }, { status: accountRes.status });
  }

  const accountData = await accountRes.json();

  // Step 2: Verify summoner exists on the specified region
  if (region) {
    const summonerUrl = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${accountData.puuid}`;
    const summonerRes = await fetch(summonerUrl, {
      headers: { "X-Riot-Token": apiKey },
    });

    if (!summonerRes.ok) {
      return NextResponse.json(
        { error: "Summoner not found in this region" },
        { status: 404 }
      );
    }
  }

  return NextResponse.json({
    puuid: accountData.puuid,
    gameName: accountData.gameName,
    tagLine: accountData.tagLine,
  });
}
