-- Cronômetro regressivo opcional por condição — pedido do usuário. Opt-in
-- explícito, não automático pra toda condição com "Válido até": esse campo
-- hoje também serve só pra esconder o item depois do prazo (sem necessariamente
-- ser uma campanha de urgência), então ganhar um cronômetro sozinho poluiria
-- condições de validade longa (ex.: "válido o ano inteiro").
ALTER TABLE commercial_conditions ADD COLUMN IF NOT EXISTS show_countdown BOOLEAN NOT NULL DEFAULT false;
