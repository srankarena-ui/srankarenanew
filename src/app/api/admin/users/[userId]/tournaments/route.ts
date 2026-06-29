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

  // Get tournaments where user participated
  const { data, error } = await supabase
    .from("tournament_participants")
    .select("tournament:tournaments(id, title, start_date, status, game, reward_points)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Extract tournaments from nested data
  const tournaments = data?.map((item: any) => item.tournament).filter(Boolean) || [];

  return Response.json(tournaments);
}
