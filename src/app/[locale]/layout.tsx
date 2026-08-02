import "../globals.css";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { locales } from "@/core/i18n/config";
import { SITE_NAME, SITE_URL } from "@/core/config/site";
import { AuthProvider } from "@/modules/auth/components/AuthProvider";
import { ToastProvider } from "@/core/ui/Toast";
import { ThemeProvider } from "@/core/ui/ThemeProvider";
import { Navbar } from "@/core/ui/Navbar";
import { Footer } from "@/core/ui/Footer";
import { getFooterConfig } from "@/core/lib/get-footer-config";
import { createClient } from "@/core/supabase/server";
import type { Profile } from "@/core/types";
import type { AuthUser } from "@/modules/auth/store";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
});

// Solo lo común a todo el sitio. El canonical y los hreflang los pone cada
// página con pageMetadata() (src/core/lib/seo.ts).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const es = locale === "es";

  return {
    // Sin esto las URLs de OpenGraph y los canonical se resuelven relativos y
    // las previsualizaciones al compartir enlaces salen rotas.
    metadataBase: new URL(SITE_URL),
    title: {
      default: es
        ? "S-Rank Arena | Torneos automáticos con desafíos"
        : "S-Rank Arena | Automated tournaments with challenges",
      template: `%s | ${SITE_NAME}`,
    },
    description: es
      ? "Torneos de League of Legends que se gestionan solos: brackets en vivo, resultados verificados desde la partida y desafíos por campeón y rol."
      : "League of Legends tournaments that run themselves: live brackets, results verified from the game, and challenges by champion and role.",
    applicationName: SITE_NAME,
    formatDetection: { telephone: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) {
    notFound();
  }

  // Run all server fetches in parallel
  const [messages, footerConfig, authData] = await Promise.all([
    import(`@/core/i18n/dictionaries/${locale}.json`).then((m) => m.default),
    getFooterConfig(),
    (async (): Promise<{ initialUser: AuthUser | null; initialProfile: Profile | null }> => {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { initialUser: null, initialProfile: null };
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        return {
          initialUser: {
            id: user.id,
            email: user.email ?? null,
          },
          initialProfile: data ?? null,
        };
      } catch {
        return { initialUser: null, initialProfile: null };
      }
    })(),
  ]);

  return (
    <html lang={locale} className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Prevent accent flash: read from localStorage before React hydrates */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const accent = localStorage.getItem('accent') || 'challenger';
                  document.documentElement.setAttribute('data-accent', accent);
                } catch (e) {
                  // localStorage not available
                }
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider initialUser={authData.initialUser} initialProfile={authData.initialProfile}>
            <ThemeProvider initialAccent="challenger">
              <ToastProvider>
                <Navbar />
                <main className="min-h-[calc(100vh-57px)]">{children}</main>
                <Footer config={footerConfig} />
              </ToastProvider>
            </ThemeProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
