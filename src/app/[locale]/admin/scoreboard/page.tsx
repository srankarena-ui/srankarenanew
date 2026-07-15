import { createClient } from "@/core/supabase/server";
import { redirect } from "next/navigation";
import { FootballScoreboardPanel } from "@/modules/admin/components/FootballScoreboardPanel";

export default async function AdminScoreboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { data: scoreboard } = await supabase.from("football_scoreboard").select("*").eq("id", 1).single();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <FootballScoreboardPanel scoreboard={scoreboard} />
    </div>
  );
}
