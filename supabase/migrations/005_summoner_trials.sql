-- =============================================================================
-- S-Rank Arena: Summoner Trials
-- =============================================================================

-- Add Summoner Trials config column to tournaments
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS trials_config jsonb;

-- ─────────────────────────────────────────────────────────────────────────────
-- SUMMONER TRIALS ENROLLMENTS
-- One record per player per Summoner Trials tournament
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.summoner_trials_enrollments (
  id               uuid          DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id    uuid          REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  user_id          uuid          REFERENCES public.profiles(id)    ON DELETE CASCADE NOT NULL,
  puuid            text          NOT NULL,
  region           text          NOT NULL DEFAULT 'na1',
  enrolled_at      timestamptz   DEFAULT now(),
  matches_tracked  int           DEFAULT 0,
  score            numeric(10,2) DEFAULT 0,
  leaderboard_rank int,
  stats_snapshot   jsonb,
  UNIQUE (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ste_tournament ON public.summoner_trials_enrollments(tournament_id);
CREATE INDEX IF NOT EXISTS idx_ste_user       ON public.summoner_trials_enrollments(user_id);

ALTER TABLE public.summoner_trials_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trials_enrollments_select" ON public.summoner_trials_enrollments
  FOR SELECT USING (true);

CREATE POLICY "trials_enrollments_insert" ON public.summoner_trials_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SUMMONER TRIALS MATCHES
-- Individual ranked matches tracked per enrollment
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.summoner_trials_matches (
  id            uuid          DEFAULT uuid_generate_v4() PRIMARY KEY,
  enrollment_id uuid          REFERENCES public.summoner_trials_enrollments(id) ON DELETE CASCADE NOT NULL,
  tournament_id uuid          NOT NULL,
  riot_match_id text          NOT NULL,
  match_data    jsonb         NOT NULL,
  game_creation bigint        NOT NULL,
  match_score   numeric(10,2) DEFAULT 0,
  synced_at     timestamptz   DEFAULT now(),
  UNIQUE (enrollment_id, riot_match_id)
);

CREATE INDEX IF NOT EXISTS idx_stm_enrollment ON public.summoner_trials_matches(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_stm_tournament ON public.summoner_trials_matches(tournament_id);

ALTER TABLE public.summoner_trials_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trials_matches_select" ON public.summoner_trials_matches
  FOR SELECT USING (true);
