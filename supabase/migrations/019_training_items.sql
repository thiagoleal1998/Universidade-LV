CREATE TABLE training_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  url         TEXT NOT NULL,
  cover_url   TEXT,
  order_index INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE training_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read active trainings" ON training_items
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admin manages trainings" ON training_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
