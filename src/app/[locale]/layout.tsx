import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { locales } from "@/core/i18n/config";
import { AuthProvider } from "@/modules/auth/components/AuthProvider";
import { ToastProvider } from "@/core/ui/Toast";
import { Navbar } from "@/core/ui/Navbar";
import { Footer } from "@/core/ui/Footer";
import { getFooterConfig } from "@/core/lib/get-footer-config";
import { createClient } from "@/core/supabase/server";
import type { Profile } from "@/core/types";
import type { AuthUser } from "@/modules/auth/store";

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
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider initialUser={authData.initialUser} initialProfile={authData.initialProfile}>
        <ToastProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-57px)]">{children}</main>
          <Footer config={footerConfig} />
        </ToastProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
