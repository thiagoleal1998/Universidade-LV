-- Famtours: viagens de familiarização divulgadas na home do membro.
-- Gestão por admin + colaboradores com a capacidade 'famtours' (áreas Comercial).
CREATE TABLE IF NOT EXISTS famtours (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,               -- nome/destino
  description   TEXT NOT NULL DEFAULT '',
  cover_url     TEXT NOT NULL DEFAULT '',
  url           TEXT NOT NULL DEFAULT '',    -- link de inscrição/detalhes
  start_date    DATE,
  end_date      DATE,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  owner_area_id UUID REFERENCES collaborator_areas(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE famtours ENABLE ROW LEVEL SECURITY;

-- RLS admin-only de propósito (mesmo padrão de training_items): a mutação do
-- colaborador passa pelo guard da server action + adminClient, não pela RLS.
CREATE POLICY "famtours_admin_all" ON famtours FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
