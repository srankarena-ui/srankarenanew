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

  const apiKey = process.env.SUPERCELL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Supercell API key not configured" }, { status: 500 });
  }

  // Get match details from our DB
  const { data: match, error } = await supabaseAdmin
    .from("tournament_matches")
    .select("*")
    .eq("id", tournamentMatchId)
    .single();

  if (error || !match) {
    return NextResponse.json({ error: "Tournament match not found" }, { status: 404 });
  }

  if (!match.player1_id || !match.player2_id) {
    return NextResponse.json({ error: "Match has no two players" }, { status: 400 });
  }

  // Get both players' CR tags
  const { data: players } = await supabaseAdmin
    .from("profiles")
    .select("id, cr_tag")
    .in("id", [match.player1_id, match.player2_id]);

  if (!players || players.length < 2) {
    return NextResponse.json({ error: "Could not find both players" }, { status: 404 });
  }

  const p1 = players.find((p) => p.id === match.player1_id)!;
  const p2 = players.find((p) => p.id === match.player2_id)!;

  if (!p1.cr_tag || !p2.cr_tag) {
    return NextResponse.json({ error: "Both players need linked CR accounts" }, { status: 400 });
  }

  // Fetch recent battles for player 1
  const tag = p1.cr_tag.replace("#", "%23");
  const battlesUrl = `https://api.clashroyale.com/v1/players/${tag}/battlelog`;
  const battlesRes = await fetch(battlesUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!battlesRes.ok) {
    return NextResponse.json({ error: "Failed to fetch battle log" }, { status: 500 });
  }

  const battles = await battlesRes.json();

  // Look for a battle between both players
  for (const battle of battles) {
    const opponentTag = battle.opponent?.[0]?.tag;
    if (opponentTag === p2.cr_tag || opponentTag === `#${p2.cr_tag}`) {
      const p1Crowns = battle.team?.[0]?.crowns || 0;
      const p2Crowns = battle.opponent?.[0]?.crowns || 0;

      const winnerId = p1Crowns > p2Crowns ? match.player1_id : match.player2_id;

      await supabaseAdmin
        .from("tournament_matches")
        .update({
          player1_score: p1Crowns,
          player2_score: p2Crowns,
          winner_id: winnerId,
          status: "completed",
        })
        .eq("id", tournamentMatchId);

      return NextResponse.json({
        found: true,
        winnerId,
        p1Crowns,
        p2Crowns,
      });
    }
  }

  return NextResponse.json({ found: false, checked: battles.length });
}
