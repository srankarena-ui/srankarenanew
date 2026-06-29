-- Create user_activity_log table for complete audit trail
CREATE TABLE user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id and created_at for fast queries
CREATE INDEX idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_created_at ON user_activity_log(created_at DESC);
CREATE INDEX idx_user_activity_log_user_created ON user_activity_log(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Allow admins to read any user's activity log
CREATE POLICY "admins_can_view_activity_logs"
ON user_activity_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'admin' OR profiles.role = 'organizador')
  )
);

-- Allow users to read their own activity log
CREATE POLICY "users_can_view_own_activity_log"
ON user_activity_log FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow service role to insert (from server functions)
CREATE POLICY "service_can_insert_activity_log"
ON user_activity_log FOR INSERT
WITH CHECK (true);
