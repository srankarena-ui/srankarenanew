import type { Metadata } from "next";
import { pageMetadata } from "@/core/lib/seo";

// Ver nota en lol/layout.tsx: la página es client component.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const es = locale === "es";

  return pageMetadata({
    locale,
    path: "/help",
    title: es ? "Ayuda y preguntas frecuentes" : "Help & FAQ",
    description: es
      ? "Cómo inscribirte en un torneo, vincular tu cuenta de Riot, formar equipo y resolver los problemas más comunes."
      : "How to join a tournament, link your Riot account, form a team and fix the most common issues.",
  });
}

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
