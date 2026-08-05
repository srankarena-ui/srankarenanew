import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAuthedRequest } from "@/core/lib/require-auth";
import { rollCastigo } from "@/core/lib/castigos";
import type { Database } from "@/core/types/database";

/**
 * Gastar un sello para imponerle un castigo a otro participante.
 *
 * El castigo lo sortea el servidor, no lo elige quien lanza: si lo eligiera,
 * siempre caería el más duro sobre el rival más incómodo. El sorteo se filtra
 * por el rol del castigado — ver castigos.ts.
 *
 * Todo con service role tras validar: el saldo y el gasto no pueden depender de
 * lo que diga el navegador.
 */
export async function POST(request: NextRequest) {
  // 10 por minuto: gastar un sello es raro, y limita el daño si alguien
  // automatiza la llamada.
  const auth = await requireAuthedRequest("seal-throw", 10, 60);
  if ("response" in auth) return auth.response;

  const { tournamentId, targetUserId } = await request.json().catch(() => ({}));
  if (!tournamentId || !targetUserId) {
    return NextResponse.json({ error: "Faltan tournamentId y targetUserId" }, { status: 400 });
  }
  if (targetUserId === auth.userId) {
    return NextResponse.json({ error: "No puedes lanzarte un sello a ti mismo" }, { status: 400 });
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // El objetivo tiene que estar inscrito en ESE torneo, no en cualquiera.
  const { data: target } = await admin
    .from("summoner_trials_enrollments")
    .select("user_id, stats_snapshot")
    .eq("tournament_id", tournamentId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "Ese jugador no está inscrito en el torneo" }, { status: 404 });
  }

  // El sello más antiguo sin gastar: gastar en orden evita que quede uno
  // atascado para siempre al fondo del inventario.
  const { data: seal } = await admin
    .from("seals")
    .select("id")
    .eq("user_id", auth.userId)
    .is("spent_at", null)
    .order("earned_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!seal) {
    return NextResponse.json({ error: "No tienes sellos sin gastar" }, { status: 400 });
  }

  const snapshot = target.stats_snapshot as { role?: string } | null;
  const elegido = rollCastigo(snapshot?.role ?? null);

  const { data: challenge, error: challengeError } = await admin
    .from("challenges")
    .insert({
      tournament_id: tournamentId,
      title: elegido.name,
      description: elegido.how,
      // El evaluador todavía no sabe comprobar los castigos; se guarda la clave
      // para que cuando sepa, no haga falta migrar nada.
      conditions: { type: "castigo", key: elegido.key },
      created_by: auth.userId,
    })
    .select("id")
    .single();

  if (challengeError || !challenge) {
    return NextResponse.json({ error: "No se pudo crear el castigo" }, { status: 500 });
  }

  await admin.from("challenge_assignments").insert({
    challenge_id: challenge.id,
    user_id: targetUserId,
  });

  // El sello se marca gastado al final: si algo falla antes, no se pierde.
  // La condición `spent_at is null` evita que dos peticiones a la vez gasten el
  // mismo sello dos veces.
  const { data: spent } = await admin
    .from("seals")
    .update({ spent_at: new Date().toISOString(), spent_on: targetUserId, challenge_id: challenge.id })
    .eq("id", seal.id)
    .is("spent_at", null)
    .select("id");

  if (!spent?.length) {
    // Otra petición se le adelantó. Se deshace el castigo para no dejar uno
    // impuesto sin sello detrás.
    await admin.from("challenges").delete().eq("id", challenge.id);
    return NextResponse.json({ error: "Ese sello ya se había gastado" }, { status: 409 });
  }

  return NextResponse.json({ castigo: elegido });
}
