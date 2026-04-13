"use client";

import { Card } from "@/core/ui/Card";
import { useTranslations } from "next-intl";

const services = [
  {
    titleKey: "service1Title" as const,
    descKey: "service1Desc" as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    ),
  },
  {
    titleKey: "service2Title" as const,
    descKey: "service2Desc" as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    titleKey: "service3Title" as const,
    descKey: "service3Desc" as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
        <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26z" />
      </svg>
    ),
  },
  {
    titleKey: "service4Title" as const,
    descKey: "service4Desc" as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3" />
      </svg>
    ),
  },
];

export function ServicesGrid() {
  const t = useTranslations("landing");

  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <h2 className="mb-12 text-center text-3xl font-black uppercase italic tracking-tighter text-white">
        {t("servicesTitle")}
      </h2>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((service) => (
          <Card key={service.titleKey} hover className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-900/30">
              {service.icon}
            </div>
            <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-white">
              {t(service.titleKey)}
            </h3>
            <p className="text-xs text-gray-500">
              {t(service.descKey)}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}
