type Section = { heading: string; body: string[] };

export function LegalDoc({
  title, updated, sections,
}: {
  title: string;
  updated: string;
  sections: Section[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-10">
        <h1 className="text-4xl uppercase italic tracking-tighter text-white">{title}</h1>
        <div className="mt-3 h-1 w-20 rounded-full bg-[var(--color-accent)]" />
        <p className="mt-4 text-xs text-gray-500">{updated}</p>
      </div>

      <div className="space-y-8">
        {sections.map((s, i) => (
          <section key={i}>
            <h2 className="mb-2 text-lg font-bold text-white">{s.heading}</h2>
            {s.body.map((p, j) => (
              <p key={j} className="mb-2 text-sm leading-relaxed text-gray-400">{p}</p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
