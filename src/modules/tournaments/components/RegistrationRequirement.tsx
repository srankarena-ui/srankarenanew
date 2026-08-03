import Link from "next/link";

/**
 * Aviso de por qué no se puede uno inscribir todavía, con el atajo a donde se
 * resuelve. Los tres casos (sin cuenta de LoL, sin dúo, sin equipo completo)
 * se arreglan en el perfil, así que el destino es siempre el mismo.
 */
export function RegistrationRequirement({
  message,
  href,
  cta,
}: {
  message: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-amber-700/40 bg-amber-900/10 p-4">
      <div className="flex gap-2">
        <span aria-hidden className="text-sm leading-none">⚠️</span>
        <p className="text-xs text-amber-200/90">{message}</p>
      </div>
      <Link
        href={href}
        className="block w-full rounded-xl bg-[var(--color-accent)] py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[var(--color-accent-hover)]"
      >
        {cta}
      </Link>
    </div>
  );
}
