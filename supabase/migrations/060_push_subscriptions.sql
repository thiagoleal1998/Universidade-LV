-- Inscrições de notificação push do navegador (Web Push API) — um usuário
-- pode ter várias linhas (um dispositivo/navegador por linha; endpoint já é
-- único por natureza, cada combinação navegador+origem gera o seu). Sem RLS
-- de leitura: só acessado via adminClient (service role) — o insert/delete
-- do próprio usuário passa por server action com guard, mesmo padrão de
-- rdstation_tokens/short_links, não por policy.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT        NOT NULL UNIQUE,
  p256dh     TEXT        NOT NULL,
  auth       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions (user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
