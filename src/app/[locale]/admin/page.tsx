import { createClient } from "@/core/supabase/server";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/modules/admin/components/AdminDashboard";
import { getAdminFooterConfig, getAboutConfig, getProductionConfig, getContactConfig, getPastEventsConfig, getFeaturedEventsConfig, getHelpConfig, getVerificationConfig } from "@/modules/admin/actions";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: games } = await supabase
    .from("games")
    .select("*")
    .order("name");

  const footerConfig = await getAdminFooterConfig();
  const aboutConfig = await getAboutConfig();
  const productionConfig = await getProductionConfig();
  const contactConfig = await getContactConfig();
  const pastEventsConfig = await getPastEventsConfig();
  const featuredEventsConfig = await getFeaturedEventsConfig();
  const helpConfig = await getHelpConfig();
  const verificationConfig = await getVerificationConfig();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <AdminDashboard
        tournaments={tournaments || []}
        users={users || []}
        games={games || []}
        footerConfig={footerConfig}
        aboutConfig={aboutConfig}
        productionConfig={productionConfig}
        contactConfig={contactConfig}
        pastEventsConfig={pastEventsConfig}
        featuredEventsConfig={featuredEventsConfig}
        helpConfig={helpConfig}
        verificationConfig={verificationConfig}
      />
    </div>
  );
}
