import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/core/types/database";
import type { Cs2WebhookPayload } from "@/core/lib/dathost";

function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// DatHost posts here on every round end and at match end (same URL for both —
// see createCs2Match). Only a finished match with a declared winner is acted on;
// round-by-round pings and already-completed matches are no-ops (idempotent).
export async function POST(request: NextRequest) {
  const payload = await request.json() as Cs2WebhookPayload;
  if (!payload.finished || !payload.winner?.team) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const supabaseAdmin = getAdminClient();
  const { data: match } = await supabaseAdmin
    .from("tournament_matches")
    .select("id, player1_id, player2_id, status")
    .eq("api_match_id", payload.id)
    .single();

  if (!match) return NextResponse.json({ error: "No tournament match for this cs2 match id" }, { status: 404 });
  if (match.status === "completed") return NextResponse.json({ ok: true, alreadyCompleted: true });
  if (!match.player1_id || !match.player2_id) {
    return NextResponse.json({ error: "Match is missing a player" }, { status: 400 });
  }

  const winnerId = payload.winner.team === "team1" ? match.player1_id : match.player2_id;

  await supabaseAdmin
    .from("tournament_matches")
    .update({
      player1_score: payload.team1?.score ?? 0,
      player2_score: payload.team2?.score ?? 0,
    })
    .eq("id", match.id);

  const { error } = await supabaseAdmin.rpc("advance_winner", {
    p_match_id: match.id,
    p_winner_id: winnerId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
