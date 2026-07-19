-- Templates de e-mail editáveis pelo admin (Admin → Configurações → aba "E-mails").
-- Substitui os textos que antes eram hardcoded em src/lib/email.ts.
CREATE TABLE IF NOT EXISTS email_templates (
  type       TEXT PRIMARY KEY,
  subject    TEXT NOT NULL,
  body_html  TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_templates_admin_all" ON email_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Conteúdo seed = exatamente o texto que estava hardcoded em src/lib/email.ts (v1.66.0),
-- só convertido para placeholders {{variavel}}.
INSERT INTO email_templates (type, subject, body_html) VALUES
  ('admin_new_member_pending', 'Novo cadastro pendente de aprovação',
   '<p>O membro <strong>{{nome}}</strong> acabou de se cadastrar e está aguardando aprovação.</p><p>Acesse o painel administrativo para aprovar ou recusar o acesso.</p>'),
  ('member_approved', 'Seu acesso foi aprovado — {{site_name}}',
   '<p>Olá, {{nome}}!</p><p>Seu cadastro foi aprovado. Agora você já pode fazer login e acessar o conteúdo da plataforma.</p>'),
  ('new_announcement', '[{{site_name}}] {{titulo}}',
   '<p><strong>{{titulo}}</strong></p><p>{{corpo}}</p>'),
  ('admin_new_feedback', '[Feedback] {{tipo}} — {{titulo}}',
   '<p><strong>{{nome}}</strong> ({{email}}) abriu um chamado ({{tipo}}):</p><p><strong>{{titulo}}</strong></p><p>{{resumo}}</p><p>Acesse o painel administrativo (Feedback) para ver os detalhes e responder.</p>'),
  ('welcome_on_register', 'Recebemos seu cadastro — {{site_name}}',
   '<p>Olá, {{nome}}!</p><p>Recebemos seu cadastro na <strong>{{site_name}}</strong> e ele já está em análise pela nossa equipe.</p><p>Assim que for aprovado, você recebe um novo e-mail liberando o acesso.</p>'),
  ('course_content_published', '[{{site_name}}] {{titulo}}',
   '<p><strong>{{titulo}}</strong></p><p>{{corpo}}</p><p><a href="{{link}}">Acessar na plataforma</a></p>'),
  ('new_training', '[{{site_name}}] {{titulo}}',
   '<p><strong>{{titulo}}</strong></p><p>{{corpo}}</p><p><a href="{{link}}">Acessar na plataforma</a></p>')
ON CONFLICT (type) DO NOTHING;
