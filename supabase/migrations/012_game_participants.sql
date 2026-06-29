-- Create game_participants table to track individual game stats
CREATE TABLE game_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_name TEXT,
  role TEXT, -- 'top', 'jg', 'mid', 'adc', 'sup' for LoL
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  gold_earned INTEGER,
  damage_dealt INTEGER,
  damage_taken INTEGER,
  result TEXT, -- 'win', 'loss', 'draw'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX idx_game_participants_user_id ON game_participants(user_id);
CREATE INDEX idx_game_participants_tournament_id ON game_participants(tournament_id);
CREATE INDEX idx_game_participants_game_id ON game_participants(game_id);
CREATE INDEX idx_game_participants_user_tournament ON game_participants(user_id, tournament_id);

-- Enable RLS
ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read game stats (public data)
CREATE POLICY "anyone_can_view_game_stats"
ON game_participants FOR SELECT
TO anon, authenticated
USING (true);

-- Allow admins to insert/update game stats
CREATE POLICY "admins_can_manage_game_stats"
ON game_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'organizador')
  )
);

CREATE POLICY "admins_can_update_game_stats"
ON game_participants FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'organizador')
  )
);
