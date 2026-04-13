"use server";

import { createClient } from "@/core/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function signInWithEmail(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
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
  }

  redirect("/");
}

export async function signInWithOAuth(provider: "google" | "discord") {
  const supabase = await createClient();
  const headerList = await headers();
  const origin = headerList.get("origin") || "";

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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
