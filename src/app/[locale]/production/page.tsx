import { getProductionConfig } from "@/modules/admin/actions";
import type { LocalizedString } from "@/core/types/site-content";

export default async function ProductionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = (locale === "en" ? "en" : "es") as "es" | "en";
  const config = await getProductionConfig();

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      {/* Heading */}
      <div className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-700/30 bg-purple-900/20 px-4 py-1.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">
            {lang === "en" ? "Services" : "Servicios"}
          </span>
        </div>
        <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">
          {(config.heading as LocalizedString)[lang]}
        </h1>
        <div className="mx-auto mt-3 h-1 w-20 rounded-full bg-purple-600" />
        {(config.subheading as LocalizedString)[lang] && (
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-gray-400">
            {(config.subheading as LocalizedString)[lang]}
          </p>
        )}
      </div>

      {/* Services grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {config.services.map((service) => (
          <div
            key={service.id}
            className="flex gap-5 rounded-2xl border border-gray-800/60 bg-[#121620] p-6 transition-colors hover:border-purple-800/50"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-700/20 text-2xl">
              {service.icon}
            </div>
            <div>
              <h3 className="mb-2 font-black uppercase tracking-wide text-white">
                {(service.title as LocalizedString)[lang]}
              </h3>
              <p className="text-sm leading-relaxed text-gray-400">
                {(service.description as LocalizedString)[lang]}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-16 text-center">
        <p className="mb-6 text-gray-400">
          {lang === "en" ? "Interested in working with us?" : "¿Te interesa trabajar con nosotros?"}
        </p>
        <a
          href="./contact"
          className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-8 py-3 text-sm font-black uppercase tracking-widest text-white transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]"
        >
          {lang === "en" ? "Contact Us" : "Contáctanos"}
        </a>
      </div>
    </div>
  );
}

