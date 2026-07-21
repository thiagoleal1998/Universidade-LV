-- Recusar cadastro pendente (distinto de "aprovado" e de "pendente" — não
-- reutiliza `active`, que já significa "pode logar").
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

INSERT INTO email_templates (type, subject, body_html) VALUES
  ('member_rejected', 'Sobre seu cadastro — {{site_name}}',
   '<p>Olá, {{nome}}!</p><p>Analisamos seu cadastro na <strong>{{site_name}}</strong> e, neste momento, não foi possível liberar seu acesso.</p><p>Se você acredita que isso foi um engano, entre em contato conosco.</p>')
ON CONFLICT (type) DO NOTHING;
