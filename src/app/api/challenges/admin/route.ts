import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/core/lib/require-auth";
import { getAdminClient } from "@/core/lib/challenge-verify";
import { parseCondition } from "@/core/lib/challenge-conditions";

// Alta de retos (staff). Sin UI todavía: se llama desde el panel a futuro o
// con fetch/curl usando la sesión del navegador.
export async function POST(request: NextRequest) {
  const staff = await requireStaff();
  if ("response" in staff) return staff.response;

  const body = await request.json().catch(() => ({}));
  const { title, description, conditions, tournamentId, startsAt, endsAt } = body;

  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title requerido" }, { status: 400 });
  }

  const parsed = parseCondition(conditions);
  if (!parsed) {
    return NextResponse.json({ error: "conditions inválidas" }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("challenges")
    .insert({
      title: title.trim(),
      description: typeof description === "string" ? description : null,
      conditions: parsed as never,
      tournament_id: typeof tournamentId === "string" ? tournamentId : null,
      starts_at: typeof startsAt === "string" ? startsAt : null,
      ends_at: typeof endsAt === "string" ? endsAt : null,
      created_by: staff.userId,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ challengeId: data.id });
}

// Listado para el panel/administración.
export async function GET() {
  const staff = await requireStaff();
  if ("response" in staff) return staff.response;

  const admin = getAdminClient();
  const { data } = await admin
    .from("challenges")
    .select("*")
    .order("created_at", { ascending: false });

  return NextResponse.json({ challenges: data ?? [] });
}
