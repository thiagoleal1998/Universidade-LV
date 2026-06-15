CREATE TABLE training_materials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES training_items(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'link',
  order_index INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE training_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read training materials" ON training_materials
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM training_items WHERE id = training_id AND is_active = true
  ));

CREATE POLICY "Admin manages training materials" ON training_materials
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
