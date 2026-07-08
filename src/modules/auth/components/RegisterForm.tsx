"use client";

import { useState } from "react";
import { signUpWithEmail } from "@/modules/auth/actions";
import { Button } from "@/core/ui/Button";
import { Input } from "@/core/ui/Input";
import { OAuthButtons } from "./OAuthButtons";
import { useTranslations } from "next-intl";

export function RegisterForm() {
  const t = useTranslations("auth");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    const result = await signUpWithEmail(formData);
    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl uppercase italic tracking-tighter text-white">
          {t("registerTitle")}
        </h1>
        <p className="mt-2 text-sm text-gray-500">{t("registerSubtitle")}</p>
      </div>

      <form action={handleSubmit} className="space-y-4">
        <Input
          id="username"
          name="username"
          type="text"
          label={t("username")}
          placeholder="ShadowPlayer99"
          required
          minLength={3}
          maxLength={20}
        />
        <Input
          id="email"
          name="email"
          type="email"
          label={t("email")}
          placeholder="player@example.com"
          required
        />
        <Input
          id="password"
          name="password"
          type="password"
          label={t("password")}
          placeholder="••••••••"
          required
          minLength={8}
        />

        {error && (
          <div className="rounded-xl border border-red-700/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          {t("registerButton")}
        </Button>
      </form>

      <OAuthButtons />

      <p className="mt-6 text-center text-sm text-gray-500">
        {t("hasAccount")}{" "}
        <a href="/login" className="text-[var(--color-accent)] hover:text-purple-300 font-semibold">
          {t("loginButton")}
        </a>
      </p>
    </div>
  );
}
