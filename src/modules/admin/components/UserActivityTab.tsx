"use client";

import { useEffect, useState } from "react";
import { ACTIVITY_LABELS } from "@/core/lib/activity-types";

interface ActivityLogEntry {
  id: string;
  action: string;
  resource_type: string;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

interface UserActivityTabProps {
  userId: string;
}

export function UserActivityTab({ userId }: UserActivityTabProps) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const res = await fetch(`/api/admin/users/${userId}/activity`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setActivities(data);
        }
      } catch (error) {
        console.error("Failed to fetch activities:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchActivities();
  }, [userId]);

  if (loading) {
    return <div className="py-8 text-center text-[var(--color-text-muted)]">Loading...</div>;
  }

  if (activities.length === 0) {
    return <div className="py-8 text-center text-[var(--color-text-muted)]">No activity yet</div>;
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]/50 p-4"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--color-accent)]">
                {ACTIVITY_LABELS[activity.action as keyof typeof ACTIVITY_LABELS] ||
                  activity.action}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {activity.resource_type}
              </span>
            </div>

            {activity.old_value && activity.new_value && (
              <div className="mt-2 text-xs text-[var(--color-text-secondary)] space-y-1">
                {Object.keys(activity.new_value).map((key) => {
                  const oldVal = activity.old_value?.[key];
                  const newVal = activity.new_value?.[key];
                  if (oldVal === newVal) return null;

                  return (
                    <div key={key}>
                      <span className="font-mono">{key}</span>: <span className="line-through text-red-500/70">{oldVal}</span>{" "}
                      → <span className="text-green-500/70">{newVal}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-2 text-xs text-[var(--color-text-muted)]">
              {new Date(activity.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
