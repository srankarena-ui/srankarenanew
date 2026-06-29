export type ActivityAction =
  | "account_created"
  | "login"
  | "logout"
  | "password_changed"
  | "email_changed"
  | "username_changed"
  | "avatar_changed"
  | "profile_updated"
  | "role_changed"
  | "tournament_joined"
  | "tournament_left"
  | "team_created"
  | "team_joined"
  | "team_left"
  | "game_played";

export type ResourceType =
  | "account"
  | "profile"
  | "settings"
  | "tournament"
  | "team"
  | "game";

export interface ActivityLogEntry {
  action: ActivityAction;
  resourceType: ResourceType;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
}

export const ACTIVITY_LABELS: Record<ActivityAction, string> = {
  account_created: "Created account",
  login: "Logged in",
  logout: "Logged out",
  password_changed: "Changed password",
  email_changed: "Changed email",
  username_changed: "Changed username",
  avatar_changed: "Updated avatar",
  profile_updated: "Updated profile",
  role_changed: "Role changed",
  tournament_joined: "Joined tournament",
  tournament_left: "Left tournament",
  team_created: "Created team",
  team_joined: "Joined team",
  team_left: "Left team",
  game_played: "Played match",
};
