-- Guarda o par access_token/refresh_token da integração OAuth2 com a RD Station
-- (app "ULV" criado no App Publisher). Linha única (id fixo = 1), atualizada
-- pelo próprio código sempre que o access_token expira (renovado via refresh_token,
-- que não expira segundo a documentação da RD Station).
--
-- Sem NENHUMA policy de leitura via client de sessão/anon — diferente de
-- site_settings (que é "FOR SELECT USING (true)", pública), estes são segredos
-- e só devem ser lidos/escritos via adminClient (service role, bypassa RLS),
-- mesmo padrão já usado em admin_activity_log/notifications/feedback_events.
CREATE TABLE IF NOT EXISTS rdstation_tokens (
  id            INTEGER PRIMARY KEY DEFAULT 1,
  access_token  TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rdstation_tokens_singleton CHECK (id = 1)
);

ALTER TABLE rdstation_tokens ENABLE ROW LEVEL SECURITY;
-- Sem policies: nega tudo por padrão pra qualquer client de sessão/anon.
