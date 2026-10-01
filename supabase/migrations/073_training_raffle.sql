-- Sorteio em treinamento: vídeo (YouTube/Vimeo/Instagram, mesmo parser já
-- usado em Famtour/Evento via getVideoEmbed) que anuncia/revela o sorteio +
-- lista de vencedores, anexados ao treinamento específico que teve o
-- sorteio. Vencedor vira tabela FILHA (mesmo padrão de training_materials),
-- não JSON — training_items é tabela relacional normal, diferente do blob
-- de settings usado em Corrida de Vendas.
ALTER TABLE training_items ADD COLUMN IF NOT EXISTS raffle_video_url TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS training_raffle_winners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID NOT NULL REFERENCES training_items(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  agencia     TEXT NOT NULL DEFAULT '',
  cidade_uf   TEXT NOT NULL DEFAULT '',
  premio      TEXT NOT NULL DEFAULT '',
  order_index INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE training_raffle_winners ENABLE ROW LEVEL SECURITY;

-- Mesmo padrão de training_materials: membro só lê vencedores de treinamento
-- ativo; mutação é sempre admin-only na RLS (colaborador passa pelo guard +
-- adminClient na server action, não pela RLS).
CREATE POLICY "Members read raffle winners of visible trainings" ON training_raffle_winners
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM training_items WHERE id = training_id AND is_active = true
  ));

CREATE POLICY "Admin manages raffle winners" ON training_raffle_winners
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
