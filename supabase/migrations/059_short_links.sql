-- Encurtador de link genérico, usado por enquanto só no e-mail de redefinição
-- de senha (a URL de recuperação do Supabase é enorme e feia pra mostrar como
-- texto num e-mail da RD Station, que não aceita variável no destino de um
-- link — só concatenar texto simples no corpo funciona). Sem RLS de leitura:
-- só acessado via adminClient (service role), igual rdstation_tokens.
CREATE TABLE IF NOT EXISTS short_links (
  code       TEXT        PRIMARY KEY,
  target_url TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE short_links ENABLE ROW LEVEL SECURITY;
