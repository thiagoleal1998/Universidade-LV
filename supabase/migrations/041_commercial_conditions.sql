-- Condições Comerciais em formato de card (substitui a planilha do Google
-- Sheets embutida em iframe). Gestão pela capacidade 'comercial' já existente
-- (Comercial Nacional/Internacional) — sem capacidade nova.
CREATE TABLE IF NOT EXISTS commercial_conditions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  cover_url     TEXT NOT NULL DEFAULT '',
  url           TEXT NOT NULL DEFAULT '',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  owner_area_id UUID REFERENCES collaborator_areas(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE commercial_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commercial_conditions_admin_all" ON commercial_conditions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
