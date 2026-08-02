import type { MetadataRoute } from "next";
import { SITE_URL } from "@/core/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Nada de esto aporta a la búsqueda: son áreas privadas, endpoints o
      // fuentes de OBS. Mantenerlas fuera evita gastar presupuesto de rastreo.
      disallow: [
        "/api/",
        "/auth/",
        "/overlay/",
        "/*/admin",
        "/*/settings",
        "/*/onboarding",
        "/*/maintenance",
        "/*/vault",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
