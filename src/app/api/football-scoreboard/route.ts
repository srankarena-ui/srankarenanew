import { NextResponse } from "next/server";
import { createClient } from "@/core/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.from("football_scoreboard").select("*").eq("id", 1).single();
  return NextResponse.json(data);
}
