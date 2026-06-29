-- Create user_login_history table to track all login attempts
CREATE TABLE user_login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_type TEXT NOT NULL, -- 'email', 'google', 'discord'
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id and created_at for fast queries
CREATE INDEX idx_user_login_history_user_id ON user_login_history(user_id);
CREATE INDEX idx_user_login_history_created_at ON user_login_history(created_at DESC);
CREATE INDEX idx_user_login_history_user_created ON user_login_history(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE user_login_history ENABLE ROW LEVEL SECURITY;

-- Allow admins to read any user's login history
CREATE POLICY "admins_can_view_login_history"
ON user_login_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'organizador')
  )
);

-- Allow users to read their own login history
CREATE POLICY "users_can_view_own_login_history"
ON user_login_history FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow service role to insert (from server functions)
CREATE POLICY "service_can_insert_login_history"
ON user_login_history FOR INSERT
WITH CHECK (true);
