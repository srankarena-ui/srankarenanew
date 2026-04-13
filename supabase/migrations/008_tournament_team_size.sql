-- Add team_size to tournaments for 1v1 / 2v2 / 5v5 bracket support
-- 1 = solo (1v1), 2 = duo (2v2), 5 = team (5v5)
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS team_size smallint NOT NULL DEFAULT 1
    CHECK (team_size IN (1, 2, 5));
