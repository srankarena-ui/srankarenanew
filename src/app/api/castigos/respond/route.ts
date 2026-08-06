import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAuthedRequestFlexible } from "@/core/lib/require-auth";
import { REJECTION_PENALTY } from "@/core/lib/castigos";
import type { Database } from "@/core/types/database";

/**
 * Aceptar o rechazar un castigo.
 *
 * Aceptar → la primera partida que EMPIECE a partir de ahora tiene que
 * cumplirlo. Rechazar → penalización y se cierra.
 *
 * Mientras esté sin decidir, el sync no cuenta ninguna partida nueva. No hace
 * falta plazo ni trabajo programado: el propio jugador quiere descongelarse.
 *
 * Flexible porque el cliente de escritorio responderá desde el aviso, y no
 * tiene cookies de navegador.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthedRequestFlexible(request, "castigo-respond", 30, 60);
  if ("response" in auth) return auth.response;

  const { assignmentId, accept } = await request.json().catch(() => ({}));
  if (!assignmentId || typeof accept !== "boolean") {
    return NextResponse.json({ error: "Faltan assignmentId y accept" }, { status: 400 });
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // `eq("user_id")` y `eq("status", "pending")` en el mismo update: nadie
  // responde por otro, y responder dos veces no cambia nada.
  const { data, error } = await admin
    .from("challenge_assignments")
    .update({
      status: accept ? "accepted" : "rejected",
      decided_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .eq("user_id", auth.userId)
    .eq("status", "pending")
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) {
    return NextResponse.json({ error: "Ese castigo no está pendiente" }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    status: accept ? "accepted" : "rejected",
    // La resta la aplica el sync sobre el total del torneo, no se guarda aquí:
    // así una sola función decide la puntuación y no hay dos fuentes.
    penalizacion: accept ? 0 : REJECTION_PENALTY,
  });
}
