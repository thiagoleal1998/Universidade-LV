CREATE TABLE lesson_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lesson_comments ENABLE ROW LEVEL SECURITY;

-- Members can read comments on published lessons
CREATE POLICY "Members can read comments"
  ON lesson_comments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM lessons WHERE id = lesson_id AND is_published = true)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Members can insert their own comments on published lessons
CREATE POLICY "Members can insert own comments"
  ON lesson_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM lessons WHERE id = lesson_id AND is_published = true)
  );

-- Members can delete their own comments; admins can delete any
CREATE POLICY "Members can delete own comments"
  ON lesson_comments FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
