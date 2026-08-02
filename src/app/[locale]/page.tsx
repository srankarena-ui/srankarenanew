import type { Metadata } from "next";
import { pageMetadata } from "@/core/lib/seo";
import { createClient } from "@/core/supabase/server";
import { HeroSection } from "@/modules/landing/components/HeroSection";
import { ServicesGrid } from "@/modules/landing/components/ServicesGrid";
import { FeaturedEventsCarousel } from "@/modules/landing/components/FeaturedEventsCarousel";
import { CTASection } from "@/modules/landing/components/CTASection";
import { getFeaturedEventsConfig } from "@/modules/admin/actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const es = locale === "es";

  return pageMetadata({
    locale,
    // La marca va explícita: Next no aplica el title.template del layout a la
    // página del mismo segmento, y la home es la que se busca por nombre.
    title: es
      ? "S-Rank Arena | Torneos automáticos con desafíos"
      : "S-Rank Arena | Automated tournaments with challenges",
    description: es
      ? "Torneos de League of Legends que se gestionan solos: brackets en vivo, resultados verificados desde la partida y desafíos por campeón y rol. Inscríbete gratis."
      : "League of Legends tournaments that run themselves: live brackets, results verified from the game, and challenges by champion and role. Free to join.",
  });
}

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

