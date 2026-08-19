-- Página de detalhe estruturada para Famtours (slug, vídeo, galeria de
-- fotos, depoimentos) e nova seção "Eventos" com a mesma estrutura, mas sem
-- exclusividade por UF (sempre aberto pra todo mundo).

-- ── Famtours: URL bonita + vídeo ────────────────────────────────────────
ALTER TABLE famtours ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE famtours ADD CONSTRAINT famtours_slug_key UNIQUE (slug);
ALTER TABLE famtours ADD COLUMN IF NOT EXISTS video_url TEXT;

CREATE TABLE famtour_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  famtour_id UUID NOT NULL REFERENCES famtours(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE famtour_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY famtour_photos_admin_all ON famtour_photos FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE TABLE famtour_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  famtour_id UUID NOT NULL REFERENCES famtours(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT '',
  photo_url TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE famtour_testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY famtour_testimonials_admin_all ON famtour_testimonials FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ── Eventos: mesma forma de famtours, SEM exclusive_ufs ─────────────────
CREATE TABLE eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  video_url TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  owner_area_id UUID REFERENCES collaborator_areas(id) ON DELETE SET NULL,
  slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY eventos_admin_all ON eventos FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE TABLE evento_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE evento_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY evento_photos_admin_all ON evento_photos FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE TABLE evento_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT '',
  photo_url TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE evento_testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY evento_testimonials_admin_all ON evento_testimonials FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
