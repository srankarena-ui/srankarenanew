"use client";

import { cn } from "@/core/lib/cn";
import { useAuthStore } from "@/modules/auth/store";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <nav className="sticky top-0 z-40 border-b border-gray-800 bg-[#0b0e14]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <a href={`/${locale}`} className="flex items-center gap-2">
          <img
            src="/s-rank-logo.svg"
            alt="S-Rank Arena"
            className="h-9 w-auto brightness-0 invert"
          />
        </a>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "text-[10px] font-bold uppercase tracking-widest transition-colors",
                pathname === link.href ? "text-purple-400" : "text-gray-500 hover:text-gray-300"
              )}
            >
              {link.label}
            </a>
          ))}

          {/* Admin links */}
          {isLoggedIn && isAdminUser && (
            <>
              <span className="h-4 w-px bg-gray-800" />
              {adminLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-widest transition-colors",
                    pathname === link.href ? "text-yellow-400" : "text-yellow-600/70 hover:text-yellow-400"
                  )}
                >
                  {link.label}
                </a>
              ))}
            </>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Locale switcher */}
          <button
            onClick={switchLocale}
            className="rounded-lg border border-gray-800 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500 transition-colors hover:border-gray-600 hover:text-gray-300"
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
                  className="flex items-center gap-1.5 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-yellow-400 transition-all hover:border-yellow-500/70 hover:bg-yellow-500/20 hover:shadow-[0_0_12px_rgba(234,179,8,0.2)]"
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
                className="rounded-full bg-purple-600 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:shadow-[0_0_12px_rgba(168,85,247,0.4)]"
              >
                {profile?.username || "Profile"}
              </a>

              {/* Settings gear */}
              <a
                href={`/${locale}/settings`}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-800 text-gray-500 transition-colors hover:border-gray-600 hover:text-gray-300"
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
                className="rounded-lg border border-gray-800 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-400 transition-colors hover:border-red-800 hover:bg-red-950/50 hover:text-red-400"
              >
                Log Out
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
        <div className="border-t border-gray-800 px-4 py-3 md:hidden">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block py-2 text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          {isLoggedIn && isAdminUser && (
            <>
              <div className="my-2 border-t border-gray-800" />
              {adminLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block py-2 text-[11px] font-bold uppercase tracking-widest text-yellow-600/70 hover:text-yellow-400"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </>
          )}
          {isLoggedIn && (
            <>
              <div className="my-2 border-t border-gray-800" />
              <button
                type="button"
                onClick={handleSignOut}
                className="block w-full py-2 text-left text-[11px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400"
              >
                Log Out
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
