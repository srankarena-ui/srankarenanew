import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/core/types/database";

/**
 * Clasificación de un torneo, lista para pintar.
 *
 * Pública y sin sesión: la consume el overlay de los streamers, que se ve en
 * directo. Devuelve solo lo que se enseña en pantalla — ni puuid, ni región, ni
 * nada que no salga ya en la web.
 *
 * El cálculo vive aquí y no en el overlay para que la clasificación del directo
 * y la de la web no puedan discrepar.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const admin = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: enrollments, error } = await admin
    .from("summoner_trials_enrollments")
    .select("user_id, score, matches_tracked, stats_snapshot")
    .eq("tournament_id", id)
    .order("score", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!enrollments?.length) return NextResponse.json({ jugadores: [] });

  const ids = enrollments.map((e) => e.user_id);

  const [{ data: perfiles }, { data: sellos }, { data: castigos }] = await Promise.all([
    admin.from("profiles").select("id, username").in("id", ids),
    admin.from("seals").select("user_id").eq("tournament_id", id).is("spent_at", null),
    admin
      .from("challenge_assignments")
      .select("user_id, challenges(title)")
      .in("user_id", ids)
      .in("status", ["pending", "accepted"]),
  ]);

  const nombre = new Map((perfiles ?? []).map((p) => [p.id, p.username ?? "—"]));

  const cuentaSellos = new Map<string, number>();
  for (const s of sellos ?? []) cuentaSellos.set(s.user_id, (cuentaSellos.get(s.user_id) ?? 0) + 1);

  const castigoDe = new Map<string, string>();
  for (const c of (castigos ?? []) as Array<{ user_id: string; challenges: { title: string } | null }>) {
    if (c.challenges?.title) castigoDe.set(c.user_id, c.challenges.title);
  }

  const jugadores = enrollments.map((e, i) => {
    const snap = e.stats_snapshot as {
      wins?: number; losses?: number; rank_tier?: string | null;
      rank_division?: string | null; rank_lp?: number | null;
    } | null;

    return {
      puesto: i + 1,
      nombre: nombre.get(e.user_id) ?? "—",
      puntos: Math.round(Number(e.score)),
      partidas: e.matches_tracked,
      victorias: snap?.wins ?? 0,
      derrotas: snap?.losses ?? 0,
      tier: snap?.rank_tier ?? null,
      division: snap?.rank_division ?? null,
      lp: snap?.rank_lp ?? null,
      sellos: cuentaSellos.get(e.user_id) ?? 0,
      castigo: castigoDe.get(e.user_id) ?? null,
    };
  });

  return NextResponse.json(
    { jugadores },
    {
      // Medio minuto de caché: el overlay de cada streamer consulta por su
      // cuenta, y la clasificación no cambia hasta que alguien sincroniza.
      headers: { "Cache-Control": "public, max-age=30" },
    }
  );
}
