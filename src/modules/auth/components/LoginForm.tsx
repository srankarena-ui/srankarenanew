"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail } from "@/modules/auth/actions";
import { Button } from "@/core/ui/Button";
import { Input } from "@/core/ui/Input";
import { OAuthButtons } from "./OAuthButtons";
import { HCaptchaWidget } from "./HCaptchaWidget";
import { useTranslations } from "next-intl";

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    formData.set("captchaToken", captchaToken ?? "");
    const result = await signInWithEmail(formData);
    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl uppercase italic tracking-tighter text-white">
          {t("loginTitle")}
        </h1>
        <p className="mt-2 text-sm text-gray-500">{t("loginSubtitle")}</p>
      </div>

      <form action={handleSubmit} className="space-y-4">
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
        />

        <HCaptchaWidget onVerify={setCaptchaToken} />

        {error && (
          <div className="rounded-xl border border-red-700/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading} disabled={!captchaToken}>
          {t("loginButton")}
        </Button>
      </form>

      <OAuthButtons />

      <p className="mt-6 text-center text-sm text-gray-500">
        {t("noAccount")}{" "}
        <a href="/register" className="text-[var(--color-accent)] hover:text-purple-300 font-semibold">
          {t("registerButton")}
        </a>
      </p>
    </div>
  );
}
