import "../globals.css";

// Los overlays viven fuera de [locale] (sin navbar, footer ni i18n) y son su
// propia raíz: al no existir app/layout.tsx, cada subdirectorio con layout
// propio es un root layout y define su <html>/<body>. Antes ambos layouts
// renderizaban html/body y la página salía con las etiquetas duplicadas.
export const metadata = {
  // Fuentes de OBS: nunca deben indexarse.
  robots: { index: false, follow: false },
};

export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
