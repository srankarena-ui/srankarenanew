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

  // Estas once consultas no dependen unas de otras. En serie eran ~180 ms cada
  // una contra Supabase, casi 2 s solo de esperas encadenadas; en paralelo la
  // página tarda lo que la más lenta.
  const [
    { data: tournaments },
    { data: users },
    { data: games },
    footerConfig,
    aboutConfig,
    productionConfig,
    contactConfig,
    pastEventsConfig,
    featuredEventsConfig,
    helpConfig,
    verificationConfig,
  ] = await Promise.all([
    supabase.from("tournaments").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("games").select("*").order("name"),
    getAdminFooterConfig(),
    getAboutConfig(),
    getProductionConfig(),
    getContactConfig(),
    getPastEventsConfig(),
    getFeaturedEventsConfig(),
    getHelpConfig(),
    getVerificationConfig(),
  ]);

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
