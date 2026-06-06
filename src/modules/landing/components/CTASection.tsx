"use client";

import { Button } from "@/core/ui/Button";
import { useTranslations, useLocale } from "next-intl";

export function CTASection() {
  const t = useTranslations("landing");
  const locale = useLocale();

  return (
    <section className="relative mx-auto max-w-4xl px-4 py-24">
      <div className="relative overflow-hidden rounded-[3rem] border border-purple-700/30 bg-gradient-to-br from-purple-900/20 to-[#121620] p-12 text-center shadow-[0_0_60px_rgba(168,85,247,0.15)]">
        <div className="absolute left-1/2 top-0 h-40 w-80 -translate-x-1/2 bg-[var(--color-accent)]/10 blur-[80px]" />
        <div className="relative z-10">
          <h2 className="text-4xl uppercase italic tracking-tighter text-white">
            {t("ctaTitle")}
          </h2>
          <p className="mt-3 text-gray-400">{t("ctaSubtitle")}</p>
          <a href={`/${locale}/register`} className="mt-8 inline-block">
            <Button size="lg" className="rounded-[2rem] px-12 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
              {t("ctaButton")}
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
