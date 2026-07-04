"use server";

import { createClient } from "@/core/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { logLogin, logAccountCreated } from "@/core/lib/activity-logger";

export async function signInWithEmail(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // Log the login
  if (data.user) {
    const headerList = await headers();
    const userAgent = headerList.get("user-agent") || "";
    await logLogin(data.user.id, "email", { userAgent });
  }

  redirect("/");
}

export async function signUpWithEmail(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Update profile with username
  if (data.user) {
    await supabase
      .from("profiles")
      .update({ username })
      .eq("id", data.user.id);

    // Log account creation
    await logAccountCreated(data.user.id, "email", username);
  }

  redirect("/");
}

export async function completeOnboarding(username: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const clean = username.trim();
  if (clean.length < 3 || clean.length > 20) return { error: "El usuario debe tener entre 3 y 20 caracteres" };
  if (!/^[a-zA-Z0-9_]+$/.test(clean)) return { error: "Solo letras, números y guion bajo" };

  const { data: taken } = await supabase
    .from("profiles").select("id").eq("username", clean).neq("id", user.id).maybeSingle();
  if (taken) return { error: "Ese usuario ya está tomado" };

  const { error } = await supabase
    .from("profiles").update({ username: clean, onboarded: true }).eq("id", user.id);
  if (error) return { error: error.message };

  return { success: true };
}

export async function signInWithOAuth(provider: "google" | "discord") {
  const supabase = await createClient();
  const headerList = await headers();

  // Build an absolute origin. If the Origin header is missing, fall back to the
  // Host header so redirectTo is never relative (a relative value makes Supabase
  // ignore it and bounce back to site_url root with ?code=).
  let origin = headerList.get("origin");
  if (!origin) {
    const host = headerList.get("host");
    if (host) origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

// Log OAuth login after callback (called from auth/callback route)
export async function logOAuthLogin(userId: string, provider: "google" | "discord") {
  const headerList = await headers();
  const userAgent = headerList.get("user-agent") || "";
  await logLogin(userId, provider, { userAgent });
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
