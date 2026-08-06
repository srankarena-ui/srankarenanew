import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAuthedRequestFlexible } from "@/core/lib/require-auth";
import { REJECTION_PENALTY } from "@/core/lib/castigos";
import { notify, NOTIFICATION_TYPES } from "@/core/lib/notify";
import type { Database } from "@/core/types/database";

/**
 * Lo que el cliente de escritorio ve y ninguna API pública expone.
 *
 * De momento solo las posiciones de cola, que es lo que resuelve el castigo
 * "Autofill": match-v5 guarda el rol en el que acabaste jugando, pero nunca lo
 * que pediste al buscar partida.
 *
 * Se reporta **al entrar en cola**, no en el lobby: hasta que pulsas buscar
 * partida la elección se puede cambiar tantas veces como quieras, así que
 * mirarla antes permitiría poner Autofill, dar el castigo por cumplido, y
 * cambiarlo justo después.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthedRequestFlexible(request, "castigo-report", 60, 60);
  if ("response" in auth) return auth.response;

  const { type, firstPosition } = await request.json().catch(() => ({}));
  if (type !== "queue_positions" || typeof firstPosition !== "string") {
    return NextResponse.json({ error: "Se esperaba { type: 'queue_positions', firstPosition }" }, { status: 400 });
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: asignaciones } = await admin
    .from("challenge_assignments")
    .select("id, challenges(conditions)")
    .eq("user_id", auth.userId)
    .eq("status", "accepted");

  const pendiente = (asignaciones ?? []).find(
    (a) => ((a as { challenges: { conditions: { key?: string } } | null }).challenges?.conditions?.key) === "autofill"
  );
  if (!pendiente) return NextResponse.json({ ok: true, resuelto: null });

  const cumplio = firstPosition.toUpperCase() === "FILL";

  const { data: resuelto } = await admin
    .from("challenge_assignments")
    .update({
      status: cumplio ? "completed" : "failed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", pendiente.id)
    .eq("status", "accepted")
    .select("id");

  if (!resuelto?.length) return NextResponse.json({ ok: true, resuelto: null });

  await notify(admin, {
    userId: auth.userId,
    type: cumplio ? NOTIFICATION_TYPES.castigoCumplido : NOTIFICATION_TYPES.castigoIncumplido,
    title: cumplio
      ? "Castigo cumplido: Autofill"
      : `Castigo incumplido: Autofill · −${REJECTION_PENALTY} puntos`,
    body: cumplio
      ? "Entraste en cola con Autofill."
      : `Entraste en cola con ${firstPosition} en vez de Autofill.`,
  });

  return NextResponse.json({ ok: true, resuelto: cumplio ? "completed" : "failed" });
}
