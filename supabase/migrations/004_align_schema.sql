-- =============================================================================
-- S-Rank Arena: Align schema with application code
-- =============================================================================

-- Add description column to tournaments
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS description text;

-- Add missing columns to games table
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS modes text[];
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Update existing game slugs
UPDATE public.games SET slug = 'lol', modes = ARRAY['1v1','5v5'] WHERE name = 'League of Legends' AND slug IS NULL;
UPDATE public.games SET slug = 'cr', modes = ARRAY['1v1'] WHERE name = 'Clash Royale' AND slug IS NULL;

-- Add api_match_id to tournament_matches if missing
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS api_match_id text;
