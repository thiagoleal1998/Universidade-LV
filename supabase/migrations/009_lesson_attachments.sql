-- ============================================================
-- Lesson attachments (downloadable files per lesson)
-- ============================================================

CREATE TABLE IF NOT EXISTS lesson_attachments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id    UUID        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  storage_path TEXT        NOT NULL,
  size_bytes   BIGINT      NOT NULL DEFAULT 0,
  mime_type    TEXT        NOT NULL DEFAULT 'application/octet-stream',
  order_index  INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lesson_attachments ENABLE ROW LEVEL SECURITY;

-- Members can read attachments of published lessons
CREATE POLICY "Members read lesson attachments" ON lesson_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons WHERE id = lesson_id AND is_published = true
    )
  );

-- Admins manage all attachments
CREATE POLICY "Admins manage lesson attachments" ON lesson_attachments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Storage bucket for lesson attachments (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-attachments', 'lesson-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read lesson attachments" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'lesson-attachments');

CREATE POLICY "Admins upload lesson attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lesson-attachments' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins delete lesson attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'lesson-attachments' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
