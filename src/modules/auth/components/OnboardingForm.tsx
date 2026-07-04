"use client";

import { useState } from "react";
import { completeOnboarding } from "@/modules/auth/actions";
import { Button } from "@/core/ui/Button";
import { Input } from "@/core/ui/Input";

// Prefill only real usernames, never the auto-generated placeholder.
function initialValue(suggested: string) {
  return /^user_[0-9a-f]{8}$/.test(suggested) ? "" : suggested;
}

export function OnboardingForm({ suggested }: { suggested: string }) {
  const [username, setUsername] = useState(initialValue(suggested));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await completeOnboarding(username);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    // Full navigation — reliable and forces a fresh session-aware render.
    window.location.href = "/";
  }

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="text-3xl uppercase italic tracking-tighter text-white">
          Elige tu usuario
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Así te verán en la arena. Puedes cambiarlo después.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="username"
          name="username"
          type="text"
          label="Usuario"
          placeholder="ShadowPlayer99"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          required
          minLength={3}
          maxLength={20}
        />

        {error && (
          <div className="rounded-xl border border-red-700/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" isLoading={loading} disabled={username.trim().length < 3}>
          Continuar
        </Button>
      </form>
    </div>
  );
}
