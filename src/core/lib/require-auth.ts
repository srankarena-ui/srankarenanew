import { NextResponse } from "next/server";
import { createClient as createBrowserlessClient } from "@supabase/supabase-js";
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

// Rutas de gestión: sesión de navegador + rol admin/organizador.
export async function requireStaff(): Promise<{ userId: string } | { response: NextResponse }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "organizador"].includes(profile.role)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { userId: user.id };
}

// Igual que requireAuthedRequest, pero también acepta `Authorization: Bearer
// <access_token>` de Supabase. El cliente de escritorio no tiene cookies de
// navegador: guarda su propia sesión y la manda en el header.
export async function requireAuthedRequestFlexible(
  request: Request,
  routeKey: string,
  limit = 60,
  windowSeconds = 60
): Promise<{ userId: string } | { response: NextResponse }> {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

  let userId: string | undefined;
  if (bearer) {
    const supabase = createBrowserlessClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await supabase.auth.getUser(bearer);
    userId = user?.id;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;
  }

  if (!userId) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const ok = await checkRateLimit(`${routeKey}:${userId}`, limit, windowSeconds);
  if (!ok) return { response: rateLimitResponse() };

  return { userId };
}
