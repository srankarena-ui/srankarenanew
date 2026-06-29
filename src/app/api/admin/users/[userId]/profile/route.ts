import { createClient } from "@/core/supabase/server";
import { logRoleChanged } from "@/core/lib/activity-logger";

async function getAdminSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, adminProfile: null };

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { supabase, user, adminProfile };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { supabase, user, adminProfile } = await getAdminSupabase();

  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!adminProfile || (adminProfile.role !== "admin" && adminProfile.role !== "organizador")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 404 });

  return Response.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { supabase, user, adminProfile } = await getAdminSupabase();

  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!adminProfile || adminProfile.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  const body = await request.json();
  const { role } = body as { role: string };

  const ALLOWED_ROLES = ["player", "organizador", "admin"];
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return Response.json({ error: "Invalid role" }, { status: 400 });
  }

  // Get current role for audit log
  const { data: current } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Log the role change
  await logRoleChanged(userId, current?.role ?? "", role, user.id);

  return Response.json(data);
}
