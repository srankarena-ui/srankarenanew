import { createClient } from "@/core/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  // Check if user is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "organizador")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get search query
  const url = new URL(request.url);
  const search = url.searchParams.get("q");

  let query = supabase.from("profiles").select("*");

  if (search) {
    query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(50);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data || []);
}
