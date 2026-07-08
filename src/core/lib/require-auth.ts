import { NextResponse } from "next/server";
import { createClient } from "@/core/supabase/server";

// Route handlers that proxy third-party APIs (Riot/Supercell) share a rate
// limit across the whole platform — require a logged-in session so an
// anonymous script can't burn that quota. Returns a 401 response to return
// immediately, or null if the caller is authenticated.
export async function requireAuthedRequest(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}
