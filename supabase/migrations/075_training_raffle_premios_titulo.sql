-- Título opcional acima da lista de benefícios de um vencedor de sorteio
-- (ex.: "Prêmios do pacote:") — pedido do usuário.
ALTER TABLE training_raffle_winners ADD COLUMN IF NOT EXISTS premios_titulo TEXT NOT NULL DEFAULT '';
