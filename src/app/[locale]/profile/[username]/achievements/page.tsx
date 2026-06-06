import { createClient } from "@/core/supabase/server";
import { notFound } from "next/navigation";
import { AchievementsList } from "@/modules/profile/components/AchievementsList";
import Link from "next/link";

export default async function AchievementsPage({
  params,
}: {
  params: Promise<{ username: string; locale: string }>;
}) {
  const { username, locale } = await params;
  const decoded = decodeURIComponent(username);
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", decoded)
    .single();

  if (!profile) notFound();

  const { data: achievementsData } = await supabase
    .rpc("get_user_achievements", { p_user_id: profile.id });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href={`/${locale}/profile/${encodeURIComponent(profile.username ?? "")}`}
          className="text-[10px] text-gray-500 hover:text-[var(--color-accent)] transition-colors"
        >
          ← {profile.username}
        </Link>
        <h1 className="text-2xl uppercase italic tracking-tighter text-white">
          Achievements
        </h1>
      </div>

      <AchievementsList achievementsData={achievementsData as { id: string; value: number }[] | null} />
    </div>
  );
}
