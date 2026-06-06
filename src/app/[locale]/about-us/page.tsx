import { getAboutConfig } from "@/modules/admin/actions";
import type { LocalizedString } from "@/core/types/site-content";

export default async function AboutUsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = (locale === "en" ? "en" : "es") as "es" | "en";
  const config = await getAboutConfig();

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      {/* Heading */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl uppercase italic tracking-tighter text-white">
          {lang === "en" ? "About Us" : "Quiénes Somos"}
        </h1>
        <div className="mx-auto mt-3 h-1 w-20 rounded-full bg-[var(--color-accent)]" />
      </div>

      {/* Description paragraphs */}
      <div className="mx-auto mb-16 max-w-3xl space-y-4">
        {config.paragraphs.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-gray-400">
            {(p as LocalizedString)[lang]}
          </p>
        ))}
      </div>

      {/* Team */}
      {config.members.length > 0 && (
        <div className="mb-16">
          <h2 className="mb-8 text-center text-3xl uppercase italic tracking-tighter text-white">
            {lang === "en" ? "Team" : "Equipo"}
          </h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
            {config.members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col items-center gap-3 rounded-2xl border border-gray-800/60 bg-[#121620] p-6 text-center"
              >
                {/* Avatar */}
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.name}
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-purple-700/30">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)]">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  </div>
                )}
                <div>
                  <p className="font-black text-white">
                    {member.nickname ? (
                      <>
                        <span className="block text-sm leading-tight">{member.name.split(" ")[0]}</span>
                        <span className="block text-[var(--color-accent)]">&quot;{member.nickname}&quot;</span>
                        <span className="block text-sm leading-tight">{member.name.split(" ").slice(1).join(" ")}</span>
                      </>
                    ) : (
                      <span className="text-sm">{member.name}</span>
                    )}
                  </p>
                  <p className="mt-1 text-[9px] font-bold text-gray-500">
                    {member.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
