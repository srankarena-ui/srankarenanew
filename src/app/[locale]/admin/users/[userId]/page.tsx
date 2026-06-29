"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs } from "@/core/ui/Tabs";
import { UserProfileTab } from "@/modules/admin/components/UserProfileTab";
import { UserActivityTab } from "@/modules/admin/components/UserActivityTab";
import { UserTournamentsTab } from "@/modules/admin/components/UserTournamentsTab";
import { UserMatchesTab } from "@/modules/admin/components/UserMatchesTab";
import type { Profile } from "@/core/types";

interface UserDetailPageProps {
  params: Promise<{ userId: string }>;
}

export default function UserDetailPage({ params: paramsPromise }: UserDetailPageProps) {
  const router = useRouter();
  const [params, setParams] = useState<{ userId: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    (async () => {
      const resolvedParams = await paramsPromise;
      setParams(resolvedParams);
    })();
  }, [paramsPromise]);

  useEffect(() => {
    if (!params?.userId) return;

    const userId = params.userId;

    async function fetchProfile() {
      try {
        const res = await fetch(`/api/admin/users/${userId}/profile`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        } else {
          router.push("/admin/users");
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        router.push("/admin/users");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [params?.userId, router]);

  if (loading) {
    return (
      <div className="py-12 text-center text-[var(--color-text-muted)]">
        Loading user details...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-12 text-center text-[var(--color-text-muted)]">
        User not found
      </div>
    );
  }

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "activity", label: "Activity" },
    { id: "tournaments", label: "Tournaments" },
    { id: "matches", label: "Matches" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)]">
            {profile.username}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            ID: {profile.id}
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div>
          {activeTab === "profile" && <UserProfileTab userId={profile.id} />}
          {activeTab === "activity" && <UserActivityTab userId={profile.id} />}
          {activeTab === "tournaments" && <UserTournamentsTab userId={profile.id} />}
          {activeTab === "matches" && <UserMatchesTab userId={profile.id} />}
        </div>
      </div>
    </div>
  );
}
