import type { Metadata } from "next";
import { SITE_NAME, SITE_OG_IMAGE } from "@/core/config/site";
import { locales } from "@/core/i18n/config";

// El canonical y los hreflang se ponen por página, nunca en el layout: si el
// layout declarara canonical, todas las páginas dirían ser la home y Google las
// trataría como duplicados.
export function pageMetadata({
  locale,
  path = "",
  title,
  description,
}: {
  locale: string;
  /** Ruta sin el locale, empezando por "/" (o "" para la home). */
  path?: string;
  title: string;
  description: string;
}): Metadata {
  const url = `/${locale}${path}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, `/${l}${path}`])),
        // Sin esto Google elige por su cuenta qué versión mostrar a quien no
        // coincide con ningún idioma declarado.
        "x-default": `/es${path}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: locale === "es" ? "es_ES" : "en_US",
      type: "website",
      images: [SITE_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SITE_OG_IMAGE],
    },
  };
}
