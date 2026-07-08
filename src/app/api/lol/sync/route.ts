import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuthedRequest } from "@/core/lib/require-auth";
import type { Database } from "@/core/types/database";

function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthedRequest("lol-sync");
  if ("response" in auth) return auth.response;

  const supabaseAdmin = getAdminClient();
  const { matchId } = await request.json();

  if (!matchId) {
    return NextResponse.json({ error: "matchId is required" }, { status: 400 });
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Riot API key not configured" }, { status: 500 });
  }

  // Fetch match data from Riot API
  const matchUrl = `https://americas.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}`;
  const matchRes = await fetch(matchUrl, {
    headers: { "X-Riot-Token": apiKey },
  });

  if (!matchRes.ok) {
    return NextResponse.json({ error: "Match not found" }, { status: matchRes.status });
  }

  const matchData = await matchRes.json();

  // Extract relevant stats from participants
  const stats = matchData.info.participants.map((p: Record<string, unknown>) => ({
    puuid: p.puuid as string,
    kills: p.kills as number,
    deaths: p.deaths as number,
    assists: p.assists as number,
    pentaKills: p.pentaKills as number,
    wardsPlaced: p.wardsPlaced as number,
    dragonKills: p.dragonKills as number,
    win: p.win as boolean,
  }));

  // For each participant with a linked account, sync stats
  let synced = 0;
  for (const stat of stats) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("riot_puuid", stat.puuid)
      .single();

    if (profile) {
      await supabaseAdmin.rpc("sync_match_stats", {
        p_user_id: profile.id,
        p_penta_kills: stat.pentaKills,
        p_wards_placed: stat.wardsPlaced,
        p_missing_pings: 0,
        p_dragon_souls: stat.dragonKills > 0 ? 1 : 0,
        p_kills: stat.kills,
      });
      synced++;
    }
  }

  return NextResponse.json({ synced, participants: stats.length });
}
