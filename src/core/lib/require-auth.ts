import { NextResponse } from "next/server";
import { createClient } from "@/core/supabase/server";
import { checkRateLimit, rateLimitResponse } from "@/core/lib/rate-limit";

// Route handlers that proxy third-party APIs (Riot/Supercell) share a rate
// limit across the whole platform — require a logged-in session so an
// anonymous script can't burn that quota, and cap requests per user so a
// single account can't either. Returns the user id to proceed, or a response
// to return immediately (401/429).
export async function requireAuthedRequest(
  routeKey: string,
  limit = 60,
  windowSeconds = 60
): Promise<{ userId: string } | { response: NextResponse }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const ok = await checkRateLimit(`${routeKey}:${user.id}`, limit, windowSeconds);
  if (!ok) return { response: rateLimitResponse() };

  return { userId: user.id };
}
