-- Vencedor de sorteio ganha vários benefícios/prêmios (lista), não um texto
-- único — pedido do usuário: "preciso de espaço pra colocar todos os
-- benefícios que o ganhador ganhou". Mesmo padrão já usado em outros campos
-- de lista livre do projeto (exclusive_ufs, video_urls): TEXT[].
ALTER TABLE training_raffle_winners ADD COLUMN IF NOT EXISTS premios TEXT[] NOT NULL DEFAULT '{}';

-- Backfill do texto único já salvo (ex.: "Pacote para Porto com:") pro
-- primeiro item da lista nova, pra não perder o que já foi cadastrado.
UPDATE training_raffle_winners
SET premios = ARRAY[premio]
WHERE premio IS NOT NULL AND premio <> '' AND premios = '{}';

ALTER TABLE training_raffle_winners DROP COLUMN IF EXISTS premio;
