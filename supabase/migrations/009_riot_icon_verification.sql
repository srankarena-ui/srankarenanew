-- =============================================================================
-- S-Rank Arena: Riot Icon Verification Challenges
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.riot_verification_challenges (
  user_id                  uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_name                text        NOT NULL,
  tagline                  text        NOT NULL,
  region                   text        NOT NULL,
  puuid                    text        NOT NULL,
  initial_profile_icon_id  integer     NOT NULL,
  current_profile_icon_id  integer,
  created_at               timestamptz NOT NULL DEFAULT now(),
  expires_at               timestamptz NOT NULL,
  verified_at              timestamptz
);

CREATE INDEX IF NOT EXISTS idx_riot_verification_puuid ON public.riot_verification_challenges(puuid);
CREATE INDEX IF NOT EXISTS idx_riot_verification_expires ON public.riot_verification_challenges(expires_at);

ALTER TABLE public.riot_verification_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "riot_verification_select" ON public.riot_verification_challenges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "riot_verification_insert" ON public.riot_verification_challenges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "riot_verification_update" ON public.riot_verification_challenges
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "riot_verification_delete" ON public.riot_verification_challenges
  FOR DELETE USING (auth.uid() = user_id);