-- ============================================================
-- Courses table (top-level grouping above modules)
-- ============================================================

CREATE TABLE IF NOT EXISTS courses (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  description      TEXT        NOT NULL DEFAULT '',
  cover_image_url  TEXT,
  order_index      INTEGER     NOT NULL DEFAULT 0,
  is_published     BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage courses" ON courses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Members read published courses" ON courses
  FOR SELECT TO authenticated
  USING (is_published = true);

-- Link modules to a course (nullable – existing modules are unaffected)
ALTER TABLE modules ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

-- Storage bucket for course cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-covers', 'course-covers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read course covers" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'course-covers');

CREATE POLICY "Admins upload course covers" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'course-covers' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins update course covers" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'course-covers' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins delete course covers" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'course-covers' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
