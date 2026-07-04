import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { logLogin } from "@/core/lib/activity-logger";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/es";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Detect which OAuth provider was used
      const provider = data.user.app_metadata?.provider;
      if (provider === "google" || provider === "discord") {
        const userAgent = request.headers.get("user-agent") || "";
        await logLogin(data.user.id, provider, { userAgent });
      }

      // New OAuth users have a placeholder username — send them to pick one.
      const { data: profile } = await supabase
        .from("profiles").select("onboarded").eq("id", data.user.id).single();
      if (profile && !profile.onboarded) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/es/login?error=auth_callback_error`);
}
