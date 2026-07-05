import { createClient } from "@/core/supabase/server";
import { HeroSection } from "@/modules/landing/components/HeroSection";
import { ServicesGrid } from "@/modules/landing/components/ServicesGrid";
import { FeaturedEventsCarousel } from "@/modules/landing/components/FeaturedEventsCarousel";
import { CTASection } from "@/modules/landing/components/CTASection";
import { getFeaturedEventsConfig } from "@/modules/admin/actions";

export default async function LandingPage() {
  const supabase = await createClient();

  const featuredConfig = await getFeaturedEventsConfig();

  let featuredTournaments: Awaited<ReturnType<typeof supabase.from>>["data"] = [];
  if (featuredConfig.tournament_ids.length > 0) {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .in("id", featuredConfig.tournament_ids);
    // Preserve the admin-configured order
    const byId = Object.fromEntries((data ?? []).map((t) => [t.id, t]));
    featuredTournaments = featuredConfig.tournament_ids.map((id) => byId[id]).filter(Boolean);
  }

  return (
    <>
      <HeroSection />
      <FeaturedEventsCarousel tournaments={featuredTournaments as never} />
      <ServicesGrid />
      <CTASection />
    </>
  );
}

