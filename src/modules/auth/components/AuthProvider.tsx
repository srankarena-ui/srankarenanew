"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/modules/auth/store";
import type { ReactNode } from "react";
import type { Profile } from "@/core/types";
import type { AuthUser } from "@/modules/auth/store";

export function AuthProvider({
  children,
  initialUser,
  initialProfile,
}: {
  children: ReactNode;
  initialUser?: AuthUser | null;
  initialProfile?: Profile | null;
}) {
  const setUser = useAuthStore((s) => s.setUser);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setLoading = useAuthStore((s) => s.setLoading);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    setLoading(true);

    const syncProfileFromServer = async () => {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const data = await response.json();
        if (data) {
          setProfile(data);
        } else {
          setProfile(null);
        }
      } catch {
        // Ignore transient profile sync failures; auth state is still authoritative.
      }
    };

    if (initialUser) {
      setUser(initialUser);
      if (initialProfile && initialProfile.id === initialUser.id) {
        setProfile(initialProfile);
      } else {
        void syncProfileFromServer();
      }
    } else {
      clear();
    }

    setLoading(false);
  }, [clear, initialProfile, initialUser, setLoading, setProfile, setUser]);

  return <>{children}</>;
}
