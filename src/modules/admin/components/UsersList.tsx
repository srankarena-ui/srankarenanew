"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/core/ui/Input";
import { Badge } from "@/core/ui/Badge";
import type { Profile } from "@/core/types";

export function UsersList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") || "");

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("q", search);

        const res = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams();
    if (value) params.set("q", value);
    router.push(`/admin/users?${params}`);
  };

  return (
    <div className="space-y-4">
      <div>
        <Input
          id="search"
          name="search"
          type="text"
          label="Search users"
          placeholder="Username or email..."
          value={search}
          onChange={(e) => handleSearchChange(e.currentTarget.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-[var(--color-text-muted)]">
          Loading users...
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-text-muted)]">
          No users found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-card)]">
              <tr>
                <th className="px-6 py-3 text-left font-bold text-[var(--color-text-primary)]">
                  Username
                </th>
                <th className="px-6 py-3 text-left font-bold text-[var(--color-text-primary)]">
                  Role
                </th>
                <th className="px-6 py-3 text-left font-bold text-[var(--color-text-primary)]">
                  Joined
                </th>
                <th className="px-6 py-3 text-center font-bold text-[var(--color-text-primary)]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-[var(--color-bg-card-hover)] transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                >
                  <td className="px-6 py-4 text-[var(--color-text-primary)]">
                    {user.username || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={user.role === "admin" ? "accent" : "default"}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-[var(--color-text-muted)] text-xs">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-[var(--color-accent)] hover:underline font-bold text-xs">
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
