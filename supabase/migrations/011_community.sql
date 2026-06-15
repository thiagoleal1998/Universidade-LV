-- ============================================================
-- Community: discussions per course
-- ============================================================

CREATE TABLE IF NOT EXISTS community_posts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL DEFAULT '',
  is_pinned   BOOLEAN     NOT NULL DEFAULT false,
  is_locked   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_replies (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID        NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE community_posts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_replies ENABLE ROW LEVEL SECURITY;

-- ── community_posts policies ─────────────────────────────────

CREATE POLICY "Members read posts" ON community_posts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM courses WHERE id = course_id AND is_published = true));

CREATE POLICY "Members create posts" ON community_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM courses WHERE id = course_id AND is_published = true)
  );

CREATE POLICY "Members delete own posts" ON community_posts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage posts" ON community_posts
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── community_replies policies ───────────────────────────────

CREATE POLICY "Members read replies" ON community_replies
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM community_posts p
    JOIN courses c ON c.id = p.course_id
    WHERE p.id = post_id AND c.is_published = true
  ));

CREATE POLICY "Members create replies" ON community_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM community_posts p
      JOIN courses c ON c.id = p.course_id
      WHERE p.id = post_id AND c.is_published = true AND p.is_locked = false
    )
  );

CREATE POLICY "Members delete own replies" ON community_replies
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage replies" ON community_replies
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
