import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/core/supabase/middleware";
import { locales, defaultLocale } from "@/core/i18n/config";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

const protectedRoutes = ["/settings", "/admin"];
const adminRoutes = ["/admin"];
const authRoutes = ["/login", "/register"];

function getPathnameWithoutLocale(pathname: string): string {
  const segments = pathname.split("/");
  // If second segment is a locale, remove it
  if (segments.length > 1 && locales.includes(segments[1] as typeof locales[number])) {
    return "/" + segments.slice(2).join("/");
  }
  return pathname;
}

export async function proxy(request: NextRequest) {
  // 1. Refresh Supabase auth session
  const { supabaseResponse, user, supabase } = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const pathnameWithoutLocale = getPathnameWithoutLocale(pathname);

  // 2. Route protection
  const isProtected = protectedRoutes.some((route) => pathnameWithoutLocale.startsWith(route));
  const isAdmin = adminRoutes.some((route) => pathnameWithoutLocale.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathnameWithoutLocale.startsWith(route));

  if (isProtected && !user) {
    const locale = pathname.split("/")[1] || defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  if (isAdmin && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "organizador") {
      const locale = pathname.split("/")[1] || defaultLocale;
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}`;
      return NextResponse.redirect(url);
    }
  }

  // 3. Redirect authenticated users away from auth routes
  if (isAuthRoute && user) {
    const locale = pathname.split("/")[1] || defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  // 4. Apply next-intl middleware (locale detection & redirect)
  const intlResponse = intlMiddleware(request);

  // Merge Supabase cookies into intl response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  return intlResponse;
}

export const config = {
  matcher: ["/((?!_next|api|auth|overlay|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
