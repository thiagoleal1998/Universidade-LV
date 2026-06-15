-- ============================================================
-- 015: Notificações, Agendamento e Enquetes na Comunidade
-- ============================================================

-- ============================================================
-- Feature 4: Agendamento (publish_at)
-- ============================================================
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ;
ALTER TABLE lessons       ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ;

-- ============================================================
-- Feature 3: Notificações Internas
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL DEFAULT '',
  link       TEXT        NOT NULL DEFAULT '',
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications(user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications"  ON notifications;
DROP POLICY IF EXISTS "Users mark notifications read" ON notifications;

CREATE POLICY "Users read own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users mark notifications read" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- INSERT is performed via service_role (admin client) which bypasses RLS

-- ============================================================
-- Feature 5: Enquetes na Comunidade
-- ============================================================
CREATE TABLE IF NOT EXISTS community_polls (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  question   TEXT        NOT NULL,
  options    JSONB       NOT NULL DEFAULT '[]',
  ends_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_poll_votes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id      UUID        NOT NULL REFERENCES community_polls(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  option_index INTEGER     NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

ALTER TABLE community_polls      ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read polls"              ON community_polls;
DROP POLICY IF EXISTS "Post author or admin insert poll" ON community_polls;
DROP POLICY IF EXISTS "Admin delete polls"              ON community_polls;

-- Polls: all authenticated members can read
CREATE POLICY "Members read polls" ON community_polls
  FOR SELECT TO authenticated USING (true);

-- Post author or admin can create a poll
CREATE POLICY "Post author or admin insert poll" ON community_polls
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM community_posts WHERE id = post_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can delete polls
CREATE POLICY "Admin delete polls" ON community_polls
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Members read votes"      ON community_poll_votes;
DROP POLICY IF EXISTS "Members insert own vote" ON community_poll_votes;
DROP POLICY IF EXISTS "Members delete own vote" ON community_poll_votes;

-- Votes
CREATE POLICY "Members read votes" ON community_poll_votes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Members insert own vote" ON community_poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members delete own vote" ON community_poll_votes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
