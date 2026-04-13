import { getContactConfig } from "@/modules/admin/actions";
import type { LocalizedString } from "@/core/types/site-content";

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = (locale === "en" ? "en" : "es") as "es" | "en";
  const config = await getContactConfig();

  const contactItems = [
    { label: "Email", value: config.email, icon: "✉️", href: config.email ? `mailto:${config.email}` : null },
    { label: "Discord", value: config.discord, icon: "💬", href: config.discord || null },
    { label: "Instagram", value: config.instagram, icon: "📸", href: config.instagram ? `https://instagram.com/${config.instagram.replace("@", "")}` : null },
    { label: "Twitter / X", value: config.twitter, icon: "𝕏", href: config.twitter ? `https://twitter.com/${config.twitter.replace("@", "")}` : null },
    { label: lang === "en" ? "Phone" : "Teléfono", value: config.phone, icon: "📞", href: config.phone ? `tel:${config.phone}` : null },
  ].filter((item) => item.value);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      {/* Heading */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">
          {(config.heading as LocalizedString)[lang]}
        </h1>
        <div className="mx-auto mt-3 h-1 w-20 rounded-full bg-purple-600" />
        {(config.description as LocalizedString)[lang] && (
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-gray-400">
            {(config.description as LocalizedString)[lang]}
          </p>
        )}
      </div>

      {/* Contact cards */}
      {contactItems.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {contactItems.map((item) => (
            <a
              key={item.label}
              href={item.href ?? "#"}
              target={item.href?.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-gray-800/60 bg-[#121620] p-5 transition-all hover:border-purple-700/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]"
            >
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{item.label}</p>
                <p className="mt-0.5 text-sm font-bold text-white">{item.value}</p>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-800 bg-[#121620] p-12 text-center">
          <p className="text-gray-500">
            {lang === "en"
              ? "Contact information has not been configured yet."
              : "La información de contacto aún no ha sido configurada."}
          </p>
        </div>
      )}
    </div>
  );
}

