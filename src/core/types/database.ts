export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          rank: string | null;
          role: string;
          experience: number;
          riot_puuid: string | null;
          riot_gamename: string | null;
          riot_tagline: string | null;
          lol_region: string | null;
          cr_tag: string | null;
          cr_name: string | null;
          riot_linked_at: string | null;
          dota2_account_id: number | null;
          steam_id64: string | null;
          discord_id: string | null;
          discriminator: string | null;
          onboarded: boolean;
          is_dummy: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          rank?: string | null;
          role?: string;
          experience?: number;
          riot_puuid?: string | null;
          riot_gamename?: string | null;
          riot_tagline?: string | null;
          lol_region?: string | null;
          cr_tag?: string | null;
          cr_name?: string | null;
          riot_linked_at?: string | null;
          dota2_account_id?: number | null;
          steam_id64?: string | null;
          discord_id?: string | null;
          discriminator?: string | null;
          onboarded?: boolean;
          is_dummy?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          rank?: string | null;
          role?: string;
          experience?: number;
          riot_puuid?: string | null;
          riot_gamename?: string | null;
          riot_tagline?: string | null;
          lol_region?: string | null;
          cr_tag?: string | null;
          cr_name?: string | null;
          riot_linked_at?: string | null;
          dota2_account_id?: number | null;
          steam_id64?: string | null;
          discord_id?: string | null;
          discriminator?: string | null;
          onboarded?: boolean;
          is_dummy?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vault_items: {
        Row: {
          asset_id: string;
          class_id: string;
          name: string;
          icon_url: string;
          rarity: string | null;
          hero: string | null;
          item_type: string | null;
          market_hash_name: string | null;
          price_cents: number | null;
          price_updated_at: string | null;
          tournament_id: string | null;
          donor_profile_id: string | null;
          status: string;
          synced_at: string;
        };
        Insert: {
          asset_id: string;
          class_id: string;
          name: string;
          icon_url: string;
          rarity?: string | null;
          hero?: string | null;
          item_type?: string | null;
          market_hash_name?: string | null;
          price_cents?: number | null;
          price_updated_at?: string | null;
          tournament_id?: string | null;
          donor_profile_id?: string | null;
          status?: string;
          synced_at?: string;
        };
        Update: {
          asset_id?: string;
          class_id?: string;
          name?: string;
          icon_url?: string;
          rarity?: string | null;
          hero?: string | null;
          item_type?: string | null;
          market_hash_name?: string | null;
          price_cents?: number | null;
          price_updated_at?: string | null;
          tournament_id?: string | null;
          donor_profile_id?: string | null;
          status?: string;
          synced_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vault_items_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vault_items_donor_profile_id_fkey";
            columns: ["donor_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      steam_verification_challenges: {
        Row: {
          user_id: string;
          account_id: number;
          code: string;
          created_at: string;
          expires_at: string;
          verified_at: string | null;
        };
        Insert: {
          user_id: string;
          account_id: number;
          code: string;
          created_at?: string;
          expires_at: string;
          verified_at?: string | null;
        };
        Update: {
          user_id?: string;
          account_id?: number;
          code?: string;
          created_at?: string;
          expires_at?: string;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      discord_link_challenges: {
        Row: {
          user_id: string;
          code: string;
          created_at: string;
          expires_at: string;
          verified_at: string | null;
        };
        Insert: {
          user_id: string;
          code: string;
          created_at?: string;
          expires_at: string;
          verified_at?: string | null;
        };
        Update: {
          user_id?: string;
          code?: string;
          created_at?: string;
          expires_at?: string;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      discord_verify_codes: {
        Row: {
          discord_user_id: string;
          code: string;
          expires_at: string;
        };
        Insert: {
          discord_user_id: string;
          code: string;
          expires_at: string;
        };
        Update: {
          discord_user_id?: string;
          code?: string;
          expires_at?: string;
        };
        Relationships: [];
      };
      riot_verification_challenges: {
        Row: {
          user_id: string;
          game_name: string;
          tagline: string;
          region: string;
          puuid: string;
          initial_profile_icon_id: number;
          current_profile_icon_id: number | null;
          created_at: string;
          expires_at: string;
          verified_at: string | null;
        };
        Insert: {
          user_id: string;
          game_name: string;
          tagline: string;
          region: string;
          puuid: string;
          initial_profile_icon_id: number;
          current_profile_icon_id?: number | null;
          created_at?: string;
          expires_at: string;
          verified_at?: string | null;
        };
        Update: {
          user_id?: string;
          game_name?: string;
          tagline?: string;
          region?: string;
          puuid?: string;
          initial_profile_icon_id?: number;
          current_profile_icon_id?: number | null;
          created_at?: string;
          expires_at?: string;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      tournaments: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          game: string;
          mode: string | null;
          status: string;
          reward_points: number;
          created_by: string;
          max_participants: number;
          series_format: string;
          rules: string | null;
          prizes: string | null;
          region: string | null;
          map: string | null;
          banner_url: string | null;
          start_date: string | null;
          start_time: string | null;
          contact_method: string | null;
          registration_open: boolean;
          check_in_enabled: boolean;
          score_reporting: string | null;
          tournament_format: string | null;
          trials_config: Json | null;
          team_size: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          game: string;
          mode?: string | null;
          status?: string;
          reward_points?: number;
          created_by: string;
          max_participants?: number;
          series_format?: string;
          rules?: string | null;
          prizes?: string | null;
          region?: string | null;
          map?: string | null;
          banner_url?: string | null;
          start_date?: string | null;
          start_time?: string | null;
          contact_method?: string | null;
          registration_open?: boolean;
          check_in_enabled?: boolean;
          score_reporting?: string | null;
          tournament_format?: string | null;
          trials_config?: Json | null;
          team_size?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          game?: string;
          mode?: string | null;
          status?: string;
          reward_points?: number;
          created_by?: string;
          max_participants?: number;
          series_format?: string;
          rules?: string | null;
          prizes?: string | null;
          region?: string | null;
          map?: string | null;
          banner_url?: string | null;
          start_date?: string | null;
          start_time?: string | null;
          contact_method?: string | null;
          registration_open?: boolean;
          check_in_enabled?: boolean;
          score_reporting?: string | null;
          tournament_format?: string | null;
          trials_config?: Json | null;
          team_size?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tournament_participants: {
        Row: {
          id: string;
          tournament_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      tournament_matches: {
        Row: {
          id: string;
          tournament_id: string;
          round_number: number;
          match_number: number;
          player1_id: string | null;
          player2_id: string | null;
          winner_id: string | null;
          status: string;
          player1_score: number;
          player2_score: number;
          api_match_id: string | null;
          cs2_connect_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          round_number: number;
          match_number: number;
          player1_id?: string | null;
          player2_id?: string | null;
          winner_id?: string | null;
          status?: string;
          player1_score?: number;
          player2_score?: number;
          api_match_id?: string | null;
          cs2_connect_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          round_number?: number;
          match_number?: number;
          player1_id?: string | null;
          player2_id?: string | null;
          winner_id?: string | null;
          status?: string;
          player1_score?: number;
          player2_score?: number;
          api_match_id?: string | null;
          cs2_connect_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_arena_stats: {
        Row: {
          user_id: string;
          penta_kills_total: number;
          wards_placed_total: number;
          ping_missing_count: number;
          tournament_wins: number;
          dragon_souls_total: number;
          kills_total: number;
          deaths_total: number;
          assists_total: number;
          games_played: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          penta_kills_total?: number;
          wards_placed_total?: number;
          ping_missing_count?: number;
          tournament_wins?: number;
          dragon_souls_total?: number;
          kills_total?: number;
          deaths_total?: number;
          assists_total?: number;
          games_played?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          penta_kills_total?: number;
          wards_placed_total?: number;
          ping_missing_count?: number;
          tournament_wins?: number;
          dragon_souls_total?: number;
          kills_total?: number;
          deaths_total?: number;
          assists_total?: number;
          games_played?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      games: {
        Row: {
          id: string;
          name: string;
          slug: string;
          modes: string[] | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          modes?: string[] | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          modes?: string[] | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      site_config: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      player_duos: {
        Row: {
          id: string;
          requester_id: string;
          partner_id: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          partner_id: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          requester_id?: string;
          partner_id?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      player_teams: {
        Row: {
          id: string;
          name: string;
          tag: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          tag?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          tag?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          status: string;
          invited_by: string | null;
          invited_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id: string;
          status?: string;
          invited_by?: string | null;
          invited_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          user_id?: string;
          status?: string;
          invited_by?: string | null;
          invited_at?: string;
        };
        Relationships: [];
      };
      summoner_trials_enrollments: {
        Row: {
          id: string;
          tournament_id: string;
          user_id: string;
          puuid: string;
          region: string;
          enrolled_at: string;
          matches_tracked: number;
          score: number;
          leaderboard_rank: number | null;
          stats_snapshot: Json | null;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          user_id: string;
          puuid: string;
          region?: string;
          enrolled_at?: string;
          matches_tracked?: number;
          score?: number;
          leaderboard_rank?: number | null;
          stats_snapshot?: Json | null;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          user_id?: string;
          puuid?: string;
          region?: string;
          enrolled_at?: string;
          matches_tracked?: number;
          score?: number;
          leaderboard_rank?: number | null;
          stats_snapshot?: Json | null;
        };
        Relationships: [];
      };
      tournament_team_registrations: {
        Row: {
          id: string;
          tournament_id: string;
          duo_id: string | null;
          team_id: string | null;
          registered_by: string | null;
          registered_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          duo_id?: string | null;
          team_id?: string | null;
          registered_by?: string | null;
          registered_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          duo_id?: string | null;
          team_id?: string | null;
          registered_by?: string | null;
          registered_at?: string;
        };
        Relationships: [];
      };
      summoner_trials_matches: {
        Row: {
          id: string;
          enrollment_id: string;
          tournament_id: string;
          riot_match_id: string;
          match_data: Json;
          game_creation: number;
          match_score: number;
          synced_at: string;
        };
        Insert: {
          id?: string;
          enrollment_id: string;
          tournament_id: string;
          riot_match_id: string;
          match_data: Json;
          game_creation: number;
          match_score?: number;
          synced_at?: string;
        };
        Update: {
          id?: string;
          enrollment_id?: string;
          tournament_id?: string;
          riot_match_id?: string;
          match_data?: Json;
          game_creation?: number;
          match_score?: number;
          synced_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      sync_match_stats: {
        Args: {
          p_user_id: string;
          p_penta_kills: number;
          p_wards_placed: number;
          p_missing_pings: number;
          p_dragon_souls: number;
          p_kills: number;
        };
        Returns: undefined;
      };
      generate_bracket: {
        Args: { p_tournament_id: string };
        Returns: undefined;
      };
      advance_winner: {
        Args: { p_match_id: string; p_winner_id: string };
        Returns: undefined;
      };
      get_user_achievements: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
