-- Tabela para captação de leads da landing page
CREATE TABLE IF NOT EXISTS landing_leads (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Impede e-mails duplicados
CREATE UNIQUE INDEX IF NOT EXISTS landing_leads_email_idx ON landing_leads (email);

-- Row Level Security
ALTER TABLE landing_leads ENABLE ROW LEVEL SECURITY;

-- Visitantes anônimos podem inserir (formulário público)
CREATE POLICY "Allow anon insert" ON landing_leads
  FOR INSERT TO anon WITH CHECK (true);

-- Usuários autenticados (admin) podem ler todos os leads
CREATE POLICY "Allow authenticated read" ON landing_leads
  FOR SELECT TO authenticated USING (true);
