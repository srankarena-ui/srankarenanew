import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/core/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/core/types/database";

/**
 * El perfil del usuario.
 *
 * Acepta cookie (la web) y Bearer (el cliente de escritorio). Solo leía cookies,
 * así que desde el cliente devolvía `null` con estado 200: la sesión existía
 * pero el perfil no llegaba nunca, y con él ni el nombre ni el distintivo de
 * streamer. Devolver 401 en vez de `null` también importa — quien llama
 * necesita distinguir "no hay sesión" de "hay sesión pero no tiene perfil".
 */
export async function GET(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

  let userId: string | undefined;
  if (bearer) {
    // Se valida con la clave anónima: quien decide si el token vale es
    // Supabase, no nosotros.
    const anon = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await anon.auth.getUser(bearer);
    userId = data.user?.id;
  } else {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id;
  }

  if (!userId) return NextResponse.json(null, { status: 401 });

  // Con service role: el usuario ya está autenticado arriba y solo lee su
  // propio perfil, así que no depende de qué deje ver RLS a cada tipo de sesión.
  const admin = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return NextResponse.json(profile ?? null);
}
