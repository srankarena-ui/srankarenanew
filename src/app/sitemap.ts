import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/core/config/site";
import { ACTIVE_GAMES } from "@/core/config/games";
import { locales, defaultLocale } from "@/core/i18n/config";

// Cada página existe en cada idioma; se emite una entrada por idioma con sus
// hreflang, para que Google no las trate como duplicados.
const STATIC_PATHS = [
  { path: "", priority: 1 },
  { path: "/tournaments", priority: 0.9 },
  { path: "/past-events", priority: 0.7 },
  { path: "/about-us", priority: 0.6 },
  { path: "/lol", priority: 0.6 },
  { path: "/help", priority: 0.5 },
  { path: "/contact", priority: 0.5 },
  { path: "/privacy", priority: 0.2 },
  { path: "/terms", priority: 0.2 },
];

const languagesFor = (path: string) =>
  Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${path}`]));

// Cliente anónimo a propósito: el sitemap solo lee lo que ya es público, así no
// depende de cookies y puede generarse sin una petición de usuario detrás.
function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const { path, priority } of STATIC_PATHS) {
    for (const locale of locales) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: path === "/tournaments" ? "daily" : "weekly",
        priority: locale === defaultLocale ? priority : priority * 0.9,
        alternates: { languages: languagesFor(path) },
      });
    }
  }

  // Torneos publicados: son las páginas que de verdad pueden traer tráfico.
  try {
    const { data: tournaments } = await publicClient()
      .from("tournaments")
      .select("id, updated_at, created_at")
      .neq("status", "draft")
      .in("game", ACTIVE_GAMES)
      .order("created_at", { ascending: false })
      .limit(500);

    for (const tournament of tournaments ?? []) {
      const path = `/tournaments/${tournament.id}`;
      for (const locale of locales) {
        entries.push({
          url: `${SITE_URL}/${locale}${path}`,
          lastModified: new Date(tournament.updated_at ?? tournament.created_at),
          changeFrequency: "daily",
          priority: 0.8,
          alternates: { languages: languagesFor(path) },
        });
      }
    }
  } catch {
    // Si Supabase falla, se sirve igual el sitemap con las páginas estáticas en
    // vez de devolver un 500 y quedarnos sin sitemap.
  }

  return entries;
}
