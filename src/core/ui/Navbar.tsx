"use client";

import { cn } from "@/core/lib/cn";
import { useAuthStore } from "@/modules/auth/store";
import { useTheme, type Accent } from "@/core/ui/ThemeProvider";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/core/ui/Button";

export function Navbar() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, setProfile } = useAuthStore();
  const { theme, accent, setTheme, setAccent } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Fallback: if user is set but profile didn't load via AuthProvider, fetch it via server API
  useEffect(() => {
    if (!user || profile) return;
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data) setProfile(data);
      })
      .catch(() => {});
  }, [user, profile, setProfile]);

  const otherLocale = locale === "es" ? "en" : "es";

  function switchLocale() {
    const segments = pathname.split("/");
    segments[1] = otherLocale;
    router.push(segments.join("/"));
  }

  async function handleSignOut() {
    try {
      // Submit a form POST to the server-side sign-out route so HTTP-only
      // Supabase cookies are properly cleared on the server.
      const form = document.createElement("form");
      form.method = "POST";
      form.action = `/api/auth/signout?locale=${locale}`;
      document.body.appendChild(form);
      form.submit();
    } catch {
      window.location.href = `/${locale}/login`;
    }
  }

  const navLinks = [
    { href: `/${locale}`, label: t("home") },
    { href: `/${locale}/tournaments`, label: t("navTournaments") },
    { href: `/${locale}/past-events`, label: t("navPastEvents") },
    { href: `/${locale}/about-us`, label: t("navAboutUs") },
    { href: `/${locale}/production`, label: t("navProduction") },
    { href: `/${locale}/contact`, label: t("navContact") },
    { href: `/${locale}/help`, label: t("navHelp") },
  ];

  const isAdminUser = !!(profile && (profile.role === "admin" || profile.role === "organizador"));

  const adminLinks = [
    { href: `/${locale}/admin`, label: "Dashboard" },
    { href: `/${locale}/admin/create-tournament`, label: "Create Event" },
  ];

  const isLoggedIn = mounted && !!user;
  const isLoggedOut = mounted && !user;

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <a href={`/${locale}`} className="flex items-center gap-2">
          <img
            src={theme === "dark" ? "/s-rank-mark-white.png" : "/s-rank-mark.png"}
            alt="S-Rank Arena"
            className="h-9 w-auto"
          />
        </a>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "text-[12px] font-medium transition-colors",
                pathname === link.href ? "text-[var(--color-accent)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              {link.label}
            </a>
          ))}

          {/* Admin links */}
          {isLoggedIn && isAdminUser && (
            <>
              <span className="h-4 w-px bg-[var(--color-border)]" />
              {adminLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-[12px] font-medium transition-colors",
                    pathname === link.href ? "text-[var(--color-warning)]" : "text-[var(--color-warning)]/60 hover:text-[var(--color-warning)]"
                  )}
                >
                  {link.label}
                </a>
              ))}
            </>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Accent selector */}
          <div className="hidden items-center gap-1 sm:flex">
            {(["challenger", "volt", "ember", "aurora"] as Accent[]).map((acc) => (
              <button
                key={acc}
                onClick={() => setAccent(acc)}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-all",
                  accent === acc ? "border-[var(--color-text-primary)]" : "border-[var(--color-border)] hover:border-[var(--color-text-secondary)]"
                )}
                style={{
                  backgroundColor:
                    acc === "challenger" ? "#3E6BFF" :
                    acc === "volt" ? "#C6F24E" :
                    acc === "ember" ? "#FF6A3D" :
                    "#8B6CFF"
                }}
                title={acc}
              />
            ))}
          </div>

          {/* Locale switcher */}
          <button
            onClick={switchLocale}
            className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs font-bold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            {otherLocale.toUpperCase()}
          </button>

          {/* Logged in */}
          {isLoggedIn && (
            <div className="flex items-center gap-2">
              {/* Admin panel button */}
              {isAdminUser && (
                <a
                  href={`/${locale}/admin`}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning-soft)] px-3 py-1.5 text-xs font-bold text-[var(--color-warning)] transition-all hover:border-[var(--color-warning)]/70 hover:shadow-[var(--color-accent-glow)]"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Admin
                </a>
              )}
              {/* Username — links to public profile */}
              <a
                href={`/${locale}/profile/${encodeURIComponent(profile?.username || user?.id || "")}`}
                className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-xs font-bold text-[var(--color-text-onaccent)] transition-all hover:shadow-[var(--color-accent-glow)]"
              >
                {profile?.username || "Profile"}
              </a>

              {/* Settings gear */}
              <a
                href={`/${locale}/settings`}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                title={t("settings")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </a>

              {/* Log Out button — always visible */}
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-bold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
              >
                Log out
              </button>
            </div>
          )}

          {/* Logged out */}
          {isLoggedOut && (
            <div className="flex items-center gap-2">
              <a href={`/${locale}/login`}>
                <Button variant="ghost" size="sm">{t("signIn")}</Button>
              </a>
              <a href={`/${locale}/register`}>
                <Button variant="primary" size="sm">{t("signUp")}</Button>
              </a>
            </div>
          )}

          {/* Mobile toggle */}
          <button
            className="ml-2 text-gray-400 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-[var(--color-border)] px-4 py-3 md:hidden">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          {isLoggedIn && isAdminUser && (
            <>
              <div className="my-2 border-t border-[var(--color-border)]" />
              {adminLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block py-2 text-sm font-medium text-[var(--color-warning)]/60 hover:text-[var(--color-warning)]"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </>
          )}
          {isLoggedIn && (
            <>
              <div className="my-2 border-t border-[var(--color-border)]" />
              <button
                type="button"
                onClick={handleSignOut}
                className="block w-full py-2 text-left text-sm font-medium text-[var(--color-danger)] hover:text-[var(--color-danger)]/80"
              >
                Log out
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
