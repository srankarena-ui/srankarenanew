import { createClient } from "@/core/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/modules/auth/components/OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("username, onboarded").eq("id", user.id).single();

  // Already picked a username — nothing to do here.
  if (profile?.onboarded) redirect("/");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-8">
      <OnboardingForm suggested={profile?.username ?? ""} />
    </div>
  );
}
