-- Grupos: condições comerciais para reservas em grupo, divulgadas em aba
-- própria na área do aluno (link no menu + página dedicada).
-- Gestão por admin + colaboradores com a capacidade 'grupos' (área nova).
CREATE TABLE IF NOT EXISTS grupos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  cover_url     TEXT NOT NULL DEFAULT '',
  url           TEXT NOT NULL DEFAULT '',
  start_date    DATE,
  end_date      DATE,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  owner_area_id UUID REFERENCES collaborator_areas(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;

-- RLS admin-only de propósito (mesmo padrão de famtours/training_items): a
-- mutação do colaborador passa pelo guard da server action + adminClient.
CREATE POLICY "grupos_admin_all" ON grupos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
