-- Segmentação Nacional/Internacional no PRODUTO (hotel/parceiro), não mais só
-- por oferta — permite inferir automaticamente o âmbito da oferta a partir do
-- produto escolhido, em vez do admin escolher os dois manualmente toda vez.
-- Sem CHECK constraint de propósito: mesmo padrão solto de marketing_items.scope
-- (valores 'Nacional'/'Internacional' validados só na aplicação).
ALTER TABLE marketing_products ADD COLUMN IF NOT EXISTS scope TEXT;
