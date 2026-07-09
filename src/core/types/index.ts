import type { Database } from "./database";

// Convenience aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
export type TournamentInsert = Database["public"]["Tables"]["tournaments"]["Insert"];
export type TournamentUpdate = Database["public"]["Tables"]["tournaments"]["Update"];
export type RiotVerificationChallenge = Database["public"]["Tables"]["riot_verification_challenges"]["Row"];
export type SteamVerificationChallenge = Database["public"]["Tables"]["steam_verification_challenges"]["Row"];
export type DiscordLinkChallenge = Database["public"]["Tables"]["discord_link_challenges"]["Row"];

export type TournamentParticipant = Database["public"]["Tables"]["tournament_participants"]["Row"];
export type TournamentMatch = Database["public"]["Tables"]["tournament_matches"]["Row"];

export type ArenaStats = Database["public"]["Tables"]["user_arena_stats"]["Row"];
export type Game = Database["public"]["Tables"]["games"]["Row"];

export type UserRole = Profile["role"];
export type TournamentStatus = Tournament["status"];
export type MatchStatus = TournamentMatch["status"];
export type SeriesFormat = Tournament["series_format"];

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum" | "s_rank";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  key: keyof Pick<ArenaStats, "penta_kills_total" | "wards_placed_total" | "ping_missing_count" | "tournament_wins" | "dragon_souls_total">;
  tiers: Record<AchievementTier, number>;
  currentValue: number;
  currentTier: AchievementTier | null;
}

export interface TournamentWithParticipants extends Tournament {
  participant_count: number;
  participants?: (TournamentParticipant & { profile: Profile })[];
}

export interface MatchWithPlayers extends TournamentMatch {
  player1?: Profile | null;
  player2?: Profile | null;
}

export type TrialsEnrollment = Database["public"]["Tables"]["summoner_trials_enrollments"]["Row"];

export interface TrialsConfig {
  matches_to_track: number;
  end_date?: string; // ISO date string, e.g. "2026-05-01"
  match_type: "solo" | "duo" | "flex" | "draft";
  scoring_weights: {
    kda: number;
    kill_participation: number;
    vision_score: number;
    cs_per_min: number;
    damage: number;
    wards_placed: number;
    objectives: number;
  };
  point_distribution: number[];
}

export interface TrialsEnrollmentWithProfile extends TrialsEnrollment {
  profile: Profile;
}

export type { VerificationConfig } from "./site-content";
