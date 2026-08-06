import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAuthedRequest } from "@/core/lib/require-auth";
import { rollCastigo } from "@/core/lib/castigos";
import { notify, NOTIFICATION_TYPES } from "@/core/lib/notify";
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

  // Se reserva el sello ANTES de crear nada. Al revés quedaban castigos
  // impuestos sin sello detrás cuando dos peticiones competían.
  //
  // El `is("spent_at", null)` dentro del update es lo que hace la reserva
  // atómica: si otra petición se adelantó, este update afecta a 0 filas y se
  // prueba con el siguiente sello en vez de fallar. Antes devolvía 409, y como
  // el navegador manda dos peticiones por clic en desarrollo, saltaba siempre.
  const reservado = await reservarSello(admin, auth.userId, targetUserId);
  if (!reservado) {
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
    // Devolver el sello: no se le cobra por un castigo que no llegó a existir.
    await admin.from("seals").update({ spent_at: null, spent_on: null }).eq("id", reservado);
    return NextResponse.json({ error: "No se pudo crear el castigo" }, { status: 500 });
  }

  await admin.from("challenge_assignments").insert({
    challenge_id: challenge.id,
    user_id: targetUserId,
  });

  await admin.from("seals").update({ challenge_id: challenge.id }).eq("id", reservado);

  // Sin esto el castigado no se enteraba salvo que abriese la clasificación y
  // mirase su propia fila.
  const [quien, aQuien] = await Promise.all([
    nombre(admin, auth.userId),
    nombre(admin, targetUserId),
  ]);
  const link = `/es/tournaments/${tournamentId}?tab=leaderboard`;

  await notify(admin, [
    {
      userId: targetUserId,
      type: NOTIFICATION_TYPES.castigoRecibido,
      title: `${quien} te ha aplicado un sello: ${elegido.name}`,
      body: elegido.how,
      link,
    },
    {
      userId: auth.userId,
      type: NOTIFICATION_TYPES.castigoLanzado,
      title: `Le has aplicado un sello a ${aQuien}: ${elegido.name}`,
      body: elegido.how,
      link,
    },
  ]);

  return NextResponse.json({ castigo: elegido });
}

/** Nombre para el texto del aviso; el id crudo no le dice nada a nadie. */
async function nombre(
  admin: ReturnType<typeof createAdminClient<Database>>,
  userId: string
): Promise<string> {
  const { data } = await admin.from("profiles").select("username").eq("id", userId).maybeSingle();
  return data?.username ?? "Alguien";
}

/** Reserva un sello sin gastar del usuario. Devuelve su id, o null si no tiene. */
async function reservarSello(
  admin: ReturnType<typeof createAdminClient<Database>>,
  userId: string,
  targetUserId: string
): Promise<string | null> {
  // Se prueban varios porque perder la carrera una vez no significa quedarse
  // sin munición: puede haber 99 más detrás.
  for (let intento = 0; intento < 5; intento++) {
    const { data: seal } = await admin
      .from("seals")
      .select("id")
      .eq("user_id", userId)
      .is("spent_at", null)
      .order("earned_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!seal) return null;

    const { data: claimed } = await admin
      .from("seals")
      .update({ spent_at: new Date().toISOString(), spent_on: targetUserId })
      .eq("id", seal.id)
      .is("spent_at", null)
      .select("id");

    if (claimed?.length) return seal.id;
  }
  return null;
}
