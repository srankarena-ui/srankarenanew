import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/core/types/database";

// Postgres-backed fixed-window limiter (see migration 022_rate_limiting.sql).
// Good enough at this traffic level — swap for Upstash/Redis if this table
// ever becomes a hot spot.
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) return true; // fail open — a limiter outage shouldn't take the API down
  return data === true;
}

export function rateLimitResponse() {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
