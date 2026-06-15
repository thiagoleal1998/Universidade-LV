-- ============================================================
-- 017: Anotações de Aulas
-- ============================================================

CREATE TABLE IF NOT EXISTS lesson_notes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id  UUID        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notes" ON lesson_notes;
CREATE POLICY "Users manage own notes" ON lesson_notes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
