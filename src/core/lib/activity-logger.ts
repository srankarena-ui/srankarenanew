"use server";

import { createClient } from "@/core/supabase/server";
import type { ActivityAction, ActivityLogEntry, ResourceType } from "./activity-types";

interface LogActivityOptions {
  action: ActivityAction;
  resourceType: ResourceType;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
}

export async function logActivity(userId: string, options: LogActivityOptions) {
  try {
    const supabase = await createClient();

    await (supabase.from("user_activity_log") as any).insert([{
      user_id: userId,
      action: options.action,
      resource_type: options.resourceType,
      old_value: options.oldValue || null,
      new_value: options.newValue || null,
      metadata: options.metadata || null,
    }]);
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Don't throw — logging failures shouldn't break the app
  }
}

export async function logLogin(
  userId: string,
  loginType: "email" | "google" | "discord",
  metadata?: { ipAddress?: string; userAgent?: string }
) {
  try {
    const supabase = await createClient();

    // Log to login_history table
    await (supabase.from("user_login_history") as any).insert([{
      user_id: userId,
      login_type: loginType,
      ip_address: metadata?.ipAddress || null,
      user_agent: metadata?.userAgent || null,
    }]);

    // Also log to activity_log
    await logActivity(userId, {
      action: "login",
      resourceType: "account",
      metadata: {
        type: loginType,
        ...metadata,
      },
    });
  } catch (error) {
    console.error("Failed to log login:", error);
  }
}

export async function logAccountCreated(
  userId: string,
  loginType: "email" | "google" | "discord",
  username?: string
) {
  await logActivity(userId, {
    action: "account_created",
    resourceType: "account",
    newValue: { username },
    metadata: { type: loginType },
  });
}

export async function logProfileUpdate(
  userId: string,
  oldValue: Record<string, any>,
  newValue: Record<string, any>
) {
  const changes: Record<string, any> = {};
  let hasChanges = false;

  // Find what actually changed
  Object.keys(newValue).forEach((key) => {
    if (oldValue[key] !== newValue[key]) {
      changes[key] = {
        old: oldValue[key],
        new: newValue[key],
      };
      hasChanges = true;
    }
  });

  if (!hasChanges) return; // Don't log if nothing changed

  // Determine the specific action based on what changed
  let action: ActivityAction = "profile_updated";
  if ("username" in changes) action = "username_changed";
  else if ("avatar_url" in changes) action = "avatar_changed";

  await logActivity(userId, {
    action,
    resourceType: "profile",
    oldValue,
    newValue,
    metadata: { changes: Object.keys(changes) },
  });
}

export async function logEmailChanged(userId: string, oldEmail: string, newEmail: string) {
  await logActivity(userId, {
    action: "email_changed",
    resourceType: "account",
    oldValue: { email: oldEmail },
    newValue: { email: newEmail },
  });
}

export async function logPasswordChanged(userId: string) {
  await logActivity(userId, {
    action: "password_changed",
    resourceType: "account",
  });
}

export async function logRoleChanged(
  userId: string,
  oldRole: string,
  newRole: string,
  changedBy: string
) {
  await logActivity(userId, {
    action: "role_changed",
    resourceType: "account",
    oldValue: { role: oldRole },
    newValue: { role: newRole },
    metadata: { changedBy },
  });
}

export async function logTournamentJoined(userId: string, tournamentId: string, tournamentName: string) {
  await logActivity(userId, {
    action: "tournament_joined",
    resourceType: "tournament",
    newValue: { tournamentId, tournamentName },
  });
}

export async function logTournamentLeft(userId: string, tournamentId: string, tournamentName: string) {
  await logActivity(userId, {
    action: "tournament_left",
    resourceType: "tournament",
    newValue: { tournamentId, tournamentName },
  });
}

export async function logGamePlayed(
  userId: string,
  tournamentId: string,
  gameId: string,
  result: "win" | "loss" | "draw",
  stats?: Record<string, any>
) {
  await logActivity(userId, {
    action: "game_played",
    resourceType: "game",
    newValue: {
      tournamentId,
      gameId,
      result,
      ...stats,
    },
  });
}

// Get activity log for a user (admin only)
export async function getUserActivityLog(userId: string, limit = 50) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_activity_log")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Failed to fetch activity log:", error);
    return [];
  }
}

// Get login history for a user (admin only)
export async function getUserLoginHistory(userId: string, limit = 20) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_login_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Failed to fetch login history:", error);
    return [];
  }
}
