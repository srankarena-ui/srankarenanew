"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/core/ui/Card";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/Button";
import { useToast } from "@/core/ui/Toast";
import { updateUserRole } from "@/modules/admin/actions";
import { useRouter } from "next/navigation";
import type { Profile } from "@/core/types";

interface UserTableProps {
  users: Profile[];
}

const ROLE_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "purple" | "outline"> = {
  user: "default",
  organizer: "warning",
  admin: "purple",
};

export function UserTable({ users }: UserTableProps) {
  const t = useTranslations("admin");
  const { toast } = useToast();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = users.filter(
    (u) =>
      (u.username || "").toLowerCase().includes(search.toLowerCase()) ||
      u.id.includes(search)
  );

  async function handleRoleChange(userId: string, newRole: string) {
    const result = await updateUserRole(userId, newRole);
    if (result.error) toast(result.error, "error");
    else {
      toast("Role updated", "success");
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder={t("searchUsers")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-xl border border-gray-800 bg-[#0b0e14] px-4 py-3 text-sm text-gray-200 outline-hidden focus:border-purple-500"
      />

      {filtered.map((user) => (
        <Card key={user.id}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-sm font-black text-purple-400">
                {(user.username || "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{user.username || "—"}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={ROLE_VARIANT[user.role] || "default"}>{user.role}</Badge>
            </div>
            <div className="flex items-center gap-2">
              {["user", "organizer", "admin"].map((role) => (
                <Button
                  key={role}
                  variant={user.role === role ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => handleRoleChange(user.id, role)}
                  disabled={user.role === role}
                >
                  {role}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      ))}

      {filtered.length === 0 && (
        <Card>
          <p className="text-center text-sm text-gray-500">{t("noResults")}</p>
        </Card>
      )}
    </div>
  );
}
