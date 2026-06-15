CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  authorized_by UUID NOT NULL REFERENCES profiles(id),
  template TEXT NOT NULL DEFAULT 'classic',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage certificates"
  ON certificates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Members can read own certificates"
  ON certificates FOR SELECT TO authenticated
  USING (user_id = auth.uid());
