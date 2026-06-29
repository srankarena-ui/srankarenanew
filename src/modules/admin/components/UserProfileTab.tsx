"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@/core/types";
import { Badge } from "@/core/ui/Badge";

interface UserProfileTabProps {
  userId: string;
}

const ROLES = ["player", "organizador", "admin"] as const;
type Role = (typeof ROLES)[number];

function roleBadgeVariant(role: string) {
  if (role === "admin") return "accent";
  if (role === "organizador") return "success";
  return "default";
}

export function UserProfileTab({ userId }: UserProfileTabProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role>("player");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, loginsRes] = await Promise.all([
          fetch(`/api/admin/users/${userId}/profile`, { cache: "no-store" }),
          fetch(`/api/admin/users/${userId}/logins`, { cache: "no-store" }),
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data);
          setSelectedRole((data.role ?? "player") as Role);
        }

        if (loginsRes.ok) {
          const data = await loginsRes.json();
          setLoginHistory(data);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId]);

  async function handleSaveRole() {
    if (!profile || selectedRole === profile.role) return;
    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setSaveMessage({ type: "success", text: "Role updated successfully" });
      } else {
        const err = await res.json();
        setSaveMessage({ type: "error", text: err.error ?? "Failed to update role" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-[var(--color-text-muted)]">Loading...</div>;
  }

  if (!profile) {
    return <div className="py-8 text-center text-[var(--color-text-muted)]">Profile not found</div>;
  }

  const lastLogin = loginHistory[0];
  const roleChanged = selectedRole !== profile.role;

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-[var(--color-text-primary)]">Profile Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)]">
              Username
            </span>
            <div className="mt-1 text-[var(--color-text-primary)]">{profile.username || "—"}</div>
          </div>

          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)]">
              Current Role
            </span>
            <div className="mt-1">
              <Badge variant={roleBadgeVariant(profile.role ?? "player")}>
                {profile.role ?? "player"}
              </Badge>
            </div>
          </div>

          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)]">
              Account Created
            </span>
            <div className="mt-1 text-[var(--color-text-primary)] text-sm">
              {profile.created_at ? new Date(profile.created_at).toLocaleString() : "—"}
            </div>
          </div>

          {lastLogin && (
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)]">
                Last Login
              </span>
              <div className="mt-1 text-[var(--color-text-primary)] text-sm">
                {new Date(lastLogin.created_at).toLocaleString()}
              </div>
            </div>
          )}

          {lastLogin && (
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)]">
                Login Type
              </span>
              <div className="mt-1 text-[var(--color-text-primary)] text-sm capitalize">
                {lastLogin.login_type}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role Assignment */}
      <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)]/40 p-5">
        <h3 className="font-bold text-lg text-[var(--color-text-primary)]">Assign Role</h3>

        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={[
                  "rounded-lg border px-4 py-2 text-sm font-bold transition-all capitalize",
                  selectedRole === role
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/50",
                ].join(" ")}
              >
                {role}
              </button>
            ))}
          </div>

          <button
            onClick={handleSaveRole}
            disabled={!roleChanged || saving}
            className={[
              "ml-auto rounded-lg px-5 py-2 text-sm font-bold transition-all",
              roleChanged && !saving
                ? "bg-[var(--color-accent)] text-[var(--color-bg-base)] hover:opacity-90"
                : "cursor-not-allowed opacity-40 bg-[var(--color-border)] text-[var(--color-text-muted)]",
            ].join(" ")}
          >
            {saving ? "Saving…" : "Save Role"}
          </button>
        </div>

        {saveMessage && (
          <div
            className={[
              "rounded-lg px-4 py-2 text-sm font-medium",
              saveMessage.type === "success"
                ? "bg-green-900/20 border border-green-700/40 text-green-400"
                : "bg-red-900/20 border border-red-700/40 text-red-400",
            ].join(" ")}
          >
            {saveMessage.text}
          </div>
        )}
      </div>

      {/* Recent Logins */}
      {loginHistory.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-[var(--color-text-primary)]">Recent Logins</h3>

          <div className="space-y-2">
            {loginHistory.slice(0, 10).map((login) => (
              <div
                key={login.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]/50 px-4 py-3"
              >
                <div className="flex-1">
                  <div className="text-sm font-bold text-[var(--color-text-primary)] capitalize">
                    {login.login_type}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {new Date(login.created_at).toLocaleString()}
                  </div>
                </div>
                {login.ip_address && (
                  <div className="text-xs text-[var(--color-text-muted)] font-mono">
                    {login.ip_address}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
