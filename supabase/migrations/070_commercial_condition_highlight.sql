-- Texto de destaque livre sobre a capa (ex.: "7x6", "30% OFF") — pedido do
-- usuário, canto inferior direito da imagem, mesmo padrão visual já usado
-- em Marketing pra badges de desconto sobre a capa da oferta.
ALTER TABLE commercial_conditions ADD COLUMN IF NOT EXISTS highlight_text TEXT NOT NULL DEFAULT '';
