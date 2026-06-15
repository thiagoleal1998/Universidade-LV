-- ============================================================
-- 016: Configurações de SEO
-- ============================================================

INSERT INTO site_settings (key, value) VALUES
  ('seo_title',               'Universidade LV'),
  ('seo_description',         'Plataforma de aprendizado exclusiva para agentes de viagem. Cursos, módulos e certificados online.'),
  ('seo_keywords',            'cursos online, agentes de viagem, capacitação, universidade, turismo'),
  ('seo_og_image',            ''),
  ('seo_canonical_url',       ''),
  ('seo_google_verification', ''),
  ('seo_robots',              'index,follow'),
  ('seo_author',              'Universidade LV')
ON CONFLICT (key) DO NOTHING;
