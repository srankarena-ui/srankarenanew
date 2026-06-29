import { createClient } from "@/core/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const supabase = await createClient();

  // Check if user is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!adminProfile || (adminProfile.role !== "admin" && adminProfile.role !== "organizador")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;

  // Get game participants (matches played)
  const { data, error } = await supabase
    .from("game_participants")
    .select("*, tournament:tournaments(id, title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data || []);
}
