-- =============================================================================
-- S-Rank Arena: Player Duos & Teams
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- PLAYER DUOS
-- A duo is a 2-player ranked partnership (for Summoner Trials duo mode)
-- A player can have max 2 active (accepted) duos
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.player_duos (
  id            uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id  uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  partner_id    uuid        REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'accepted', 'rejected', 'disbanded')),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  CONSTRAINT no_self_duo CHECK (requester_id <> partner_id),
  CONSTRAINT unique_duo_pair UNIQUE (requester_id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_pd_requester ON public.player_duos(requester_id);
CREATE INDEX IF NOT EXISTS idx_pd_partner   ON public.player_duos(partner_id);
CREATE INDEX IF NOT EXISTS idx_pd_status    ON public.player_duos(status);

ALTER TABLE public.player_duos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "duo_select" ON public.player_duos
  FOR SELECT USING (true);

CREATE POLICY "duo_insert" ON public.player_duos
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "duo_update" ON public.player_duos
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = partner_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- PLAYER TEAMS
-- A team is for Flex mode (up to 5 players)
-- A player can be in max 2 active (accepted) teams
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.player_teams (
  id          uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        text        NOT NULL,
  tag         text,        -- short tag e.g. SRNK  (max 5 chars)
  created_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pt_created_by ON public.player_teams(created_by);

ALTER TABLE public.player_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_select" ON public.player_teams
  FOR SELECT USING (true);

CREATE POLICY "team_insert" ON public.player_teams
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "team_delete" ON public.player_teams
  FOR DELETE USING (auth.uid() = created_by);

-- ─────────────────────────────────────────────────────────────────────────────
-- TEAM MEMBERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_members (
  id          uuid        DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id     uuid        REFERENCES public.player_teams(id) ON DELETE CASCADE NOT NULL,
  user_id     uuid        REFERENCES public.profiles(id)     ON DELETE CASCADE NOT NULL,
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'accepted', 'rejected')),
  invited_by  uuid        REFERENCES public.profiles(id),
  invited_at  timestamptz DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tm_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_tm_user ON public.team_members(user_id);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_member_select" ON public.team_members
  FOR SELECT USING (true);

CREATE POLICY "team_member_insert" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid() AND tm.status = 'accepted'
    )
    OR auth.uid() = invited_by
  );

CREATE POLICY "team_member_update" ON public.team_members
  FOR UPDATE USING (auth.uid() = user_id);

-- team_update policy placed here because it references team_members (created above)
CREATE POLICY "team_update" ON public.player_teams
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = player_teams.id
        AND team_members.user_id = auth.uid()
        AND team_members.status = 'accepted'
    )
  );
