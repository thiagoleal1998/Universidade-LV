-- Tabela de configurações do site
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Valores padrão
INSERT INTO site_settings (key, value) VALUES
  ('site_name', 'Universidade LV'),
  ('site_tagline', 'Sua plataforma de aprendizado'),
  ('primary_color', 'default'),
  ('logo_url', '')
ON CONFLICT (key) DO NOTHING;

-- Segurança
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode ler configurações" ON site_settings
  FOR SELECT USING (true);

CREATE POLICY "Admin pode editar configurações" ON site_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
