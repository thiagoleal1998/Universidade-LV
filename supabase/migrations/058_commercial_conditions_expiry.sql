-- Validade opcional de uma condição comercial: a partir do dia seguinte a
-- `expires_at`, o item some da tela dos membros (dashboard/comercial), mas
-- continua visível/editável no admin pra quem tem posse — permite "renovar"
-- só atualizando a data, sem perder o item nem precisar recriar do zero.
ALTER TABLE commercial_conditions ADD COLUMN IF NOT EXISTS expires_at DATE;
