import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/core/lib/require-auth";
import { getAdminClient } from "@/core/lib/challenge-verify";

// Asigna un reto a uno o varios usuarios. Re-asignar a alguien que ya lo tiene
// no hace nada (unique challenge_id + user_id), así que es seguro repetir.
export async function POST(request: NextRequest) {
  const staff = await requireStaff();
  if ("response" in staff) return staff.response;

  const { challengeId, userIds } = await request.json().catch(() => ({}));

  if (typeof challengeId !== "string" || !challengeId) {
    return NextResponse.json({ error: "challengeId requerido" }, { status: 400 });
  }
  if (!Array.isArray(userIds) || userIds.length === 0 || userIds.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "userIds requerido" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { error } = await admin
    .from("challenge_assignments")
    .upsert(
      userIds.map((userId: string) => ({ challenge_id: challengeId, user_id: userId })),
      { onConflict: "challenge_id,user_id", ignoreDuplicates: true }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ assigned: userIds.length });
}
