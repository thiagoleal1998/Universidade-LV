-- Papel "collaborator": pessoas internas que criam/gerenciam conteúdo da própria
-- área (cursos, treinamentos, bloqueios aéreos, condições comerciais) sem acesso
-- total de admin. As áreas são configuráveis pelo admin (tabela collaborator_areas),
-- com capacidades validadas na aplicação (src/lib/capabilities.ts).

-- 1. Novo papel
ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'member', 'collaborator'));

-- 2. Áreas de colaborador
CREATE TABLE IF NOT EXISTS collaborator_areas (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL UNIQUE,
  capabilities TEXT[]      NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE collaborator_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_collaborator_areas" ON collaborator_areas
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "authenticated_read_collaborator_areas" ON collaborator_areas
  FOR SELECT TO authenticated USING (true);

-- 3. Vínculo perfil → área (um colaborador pertence a exatamente uma área)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS collaborator_area_id UUID
  REFERENCES collaborator_areas(id) ON DELETE SET NULL;

-- 4. Dono do conteúdo (NULL = conteúdo global, do admin).
--    modules/lessons herdam o dono via course_id — sem coluna própria.
ALTER TABLE courses         ADD COLUMN IF NOT EXISTS owner_area_id UUID REFERENCES collaborator_areas(id) ON DELETE SET NULL;
ALTER TABLE training_items  ADD COLUMN IF NOT EXISTS owner_area_id UUID REFERENCES collaborator_areas(id) ON DELETE SET NULL;
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS owner_area_id UUID REFERENCES collaborator_areas(id) ON DELETE SET NULL;
