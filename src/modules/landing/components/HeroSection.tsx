"use client";

import { Button } from "@/core/ui/Button";
import { useTranslations, useLocale } from "next-intl";

export function HeroSection() {
  const t = useTranslations("landing");
  const locale = useLocale();

  return (
    <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-[#0b0e14] to-[#0b0e14]" />
      <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[var(--color-accent)]/10 blur-[120px]" />

      <div className="relative z-10 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-700/30 bg-purple-900/20 px-4 py-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-accent-hover)]" />
          <span className="text-[9px] text-[var(--color-accent)]">
            Live Platform
          </span>
        </div>

        <h1 className="text-6xl uppercase italic tracking-tighter text-white md:text-8xl">
          {t("heroTitle")}
        </h1>

        <p className="mx-auto mt-4 max-w-md text-lg text-gray-400">
          {t("heroSubtitle")}
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <a href={`/${locale}/register`}>
            <Button size="lg" className="rounded-[2rem] px-10 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
              {t("heroCta")}
            </Button>
          </a>
          <a href={`/${locale}/tournaments`}>
            <Button variant="secondary" size="lg" className="rounded-[2rem] px-10">
              Tournaments
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
