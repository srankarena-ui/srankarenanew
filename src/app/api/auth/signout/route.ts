import { createClient } from "@/core/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const locale = request.nextUrl.searchParams.get("locale") || "es";

  const response = NextResponse.redirect(new URL(`/${locale}/login`, request.url));

  // Explicitly clear all Supabase auth cookies
  const cookieNames = request.cookies.getAll().map((c) => c.name);
  for (const name of cookieNames) {
    if (name.includes("supabase") || name.includes("sb-")) {
      response.cookies.set(name, "", { maxAge: 0, path: "/" });
    }
  }

  return response;
}
