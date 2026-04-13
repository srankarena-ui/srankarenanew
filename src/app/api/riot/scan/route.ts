import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/core/types/database";

function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = getAdminClient();
  const { tournamentMatchId } = await request.json();

  if (!tournamentMatchId) {
    return NextResponse.json({ error: "tournamentMatchId is required" }, { status: 400 });
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Riot API key not configured" }, { status: 500 });
  }

  // Get match details from our DB
  const { data: match, error } = await supabaseAdmin
    .from("tournament_matches")
    .select("*, tournament:tournaments(*)")
    .eq("id", tournamentMatchId)
    .single();

  if (error || !match) {
    return NextResponse.json({ error: "Tournament match not found" }, { status: 404 });
  }

  if (!match.player1_id || !match.player2_id) {
    return NextResponse.json({ error: "Match has no two players" }, { status: 400 });
  }

  // Get both player profiles
  const { data: players } = await supabaseAdmin
    .from("profiles")
    .select("id, riot_puuid, lol_region")
    .in("id", [match.player1_id, match.player2_id]);

  if (!players || players.length < 2) {
    return NextResponse.json({ error: "Could not find both players" }, { status: 404 });
  }

  const p1 = players.find((p) => p.id === match.player1_id)!;
  const p2 = players.find((p) => p.id === match.player2_id)!;

  if (!p1.riot_puuid || !p2.riot_puuid) {
    return NextResponse.json({ error: "Both players need linked Riot accounts" }, { status: 400 });
  }

  // Fetch recent matches for player 1
  const region = p1.lol_region || "na1";
  const matchListUrl = `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${p1.riot_puuid}/ids?start=0&count=5`;
  const matchListRes = await fetch(matchListUrl, {
    headers: { "X-Riot-Token": apiKey },
  });

  if (!matchListRes.ok) {
    return NextResponse.json({ error: "Failed to fetch match list" }, { status: 500 });
  }

  const matchIds: string[] = await matchListRes.json();

  // Check each match for both players
  for (const riotMatchId of matchIds) {
    const matchUrl = `https://americas.api.riotgames.com/lol/match/v5/matches/${riotMatchId}`;
    const matchRes = await fetch(matchUrl, {
      headers: { "X-Riot-Token": apiKey },
    });

    if (!matchRes.ok) continue;

    const matchData = await matchRes.json();
    const puuids = matchData.info.participants.map((p: { puuid: string }) => p.puuid);

    // Check if both players are in this match
    if (puuids.includes(p1.riot_puuid) && puuids.includes(p2.riot_puuid)) {
      const p1Data = matchData.info.participants.find(
        (p: { puuid: string }) => p.puuid === p1.riot_puuid
      );
      const p2Data = matchData.info.participants.find(
        (p: { puuid: string }) => p.puuid === p2.riot_puuid
      );

      // Determine winner based on who won the Riot match
      const winnerId = p1Data.win ? match.player1_id : match.player2_id;

      // Update tournament match
      await supabaseAdmin
        .from("tournament_matches")
        .update({
          player1_score: p1Data.win ? 1 : 0,
          player2_score: p2Data.win ? 1 : 0,
          winner_id: winnerId,
          status: "completed",
          api_match_id: riotMatchId,
        })
        .eq("id", tournamentMatchId);

      // Sync stats for both players
      await supabaseAdmin.rpc("sync_match_stats", {
        p_user_id: match.player1_id,
        p_penta_kills: p1Data.pentaKills || 0,
        p_wards_placed: p1Data.wardsPlaced || 0,
        p_missing_pings: 0,
        p_dragon_souls: (p1Data.dragonKills || 0) > 0 ? 1 : 0,
        p_kills: p1Data.kills || 0,
      });

      await supabaseAdmin.rpc("sync_match_stats", {
        p_user_id: match.player2_id,
        p_penta_kills: p2Data.pentaKills || 0,
        p_wards_placed: p2Data.wardsPlaced || 0,
        p_missing_pings: 0,
        p_dragon_souls: (p2Data.dragonKills || 0) > 0 ? 1 : 0,
        p_kills: p2Data.kills || 0,
      });

      return NextResponse.json({
        found: true,
        riotMatchId,
        winnerId,
        synced: true,
      });
    }
  }

  return NextResponse.json({ found: false, checked: matchIds.length });
}
