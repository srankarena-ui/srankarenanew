-- =============================================================================
-- S-Rank Arena: Tournament Team Registrations
-- For Summoner Trials tournaments with duo/flex queue_type,
-- registration is team-based (player_duos or player_teams), not individual.
-- max_participants on the tournament = max number of TEAMS/DUOS allowed.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tournament_team_registrations (
  id            uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  tournament_id uuid        REFERENCES public.tournaments(id)     ON DELETE CASCADE NOT NULL,
  -- exactly one of these will be set depending on queue_type
  duo_id        uuid        REFERENCES public.player_duos(id)     ON DELETE CASCADE,
  team_id       uuid        REFERENCES public.player_teams(id)    ON DELETE CASCADE,
  registered_by uuid        REFERENCES public.profiles(id)        ON DELETE SET NULL,
  registered_at timestamptz DEFAULT now(),
  -- prevent double-registration
  CONSTRAINT unique_duo_per_tournament  UNIQUE (tournament_id, duo_id),
  CONSTRAINT unique_team_per_tournament UNIQUE (tournament_id, team_id),
  -- ensure exactly one of duo_id / team_id is set
  CONSTRAINT one_entity CHECK (
    (duo_id IS NOT NULL AND team_id IS NULL) OR
    (duo_id IS NULL    AND team_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_ttr_tournament ON public.tournament_team_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_ttr_duo        ON public.tournament_team_registrations(duo_id);
CREATE INDEX IF NOT EXISTS idx_ttr_team       ON public.tournament_team_registrations(team_id);

ALTER TABLE public.tournament_team_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ttr_select" ON public.tournament_team_registrations
  FOR SELECT USING (true);

CREATE POLICY "ttr_insert" ON public.tournament_team_registrations
  FOR INSERT WITH CHECK (auth.uid() = registered_by);

CREATE POLICY "ttr_delete" ON public.tournament_team_registrations
  FOR DELETE USING (auth.uid() = registered_by);
