-- Mídia do sorteio pode ser vídeo (já existia, raffle_video_url) OU imagem
-- (nova) — pedido do usuário. Os dois campos coexistem na tabela, mas o
-- admin escolhe um modo por vez no formulário (cliente zera o outro campo
-- ao trocar de modo, sem exigir exclusividade mútua no banco).
ALTER TABLE training_items ADD COLUMN IF NOT EXISTS raffle_image_url TEXT NOT NULL DEFAULT '';
