-- member_courses: controls which courses each member can access
CREATE TABLE IF NOT EXISTS member_courses (
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, course_id)
);

ALTER TABLE member_courses ENABLE ROW LEVEL SECURITY;

-- Members can read their own course access list
CREATE POLICY "member_courses_self_read" ON member_courses
  FOR SELECT TO authenticated
  USING (member_id = auth.uid());

-- Admins manage all course access
CREATE POLICY "member_courses_admin_all" ON member_courses
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
