import type { Metadata } from "next";
import { pageMetadata } from "@/core/lib/seo";

// La página es un client component y no puede exportar generateMetadata, así
// que los metadatos van en este layout.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const es = locale === "es";

  return pageMetadata({
    locale,
    path: "/lol",
    title: es ? "Buscar estadísticas de invocador" : "Summoner Stats Lookup",
    description: es
      ? "Consulta el perfil de cualquier invocador de League of Legends: rango, maestría de campeones e historial de partidas recientes."
      : "Look up any League of Legends summoner: rank, champion mastery and recent match history.",
  });
}

export default function LolLayout({ children }: { children: React.ReactNode }) {
  return children;
}
