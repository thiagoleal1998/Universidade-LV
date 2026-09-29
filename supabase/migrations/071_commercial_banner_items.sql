-- Lista de parceiros/condições da "planilha" que abre ao clicar no banner de
-- campanha (settings.commercial_banner) — lista SEPARADA de propósito de
-- `commercial_conditions` (decisão do usuário): permite um conjunto de
-- parceiros específico da campanha do banner, sem misturar com os cards fixos
-- de Condições Comerciais. Sem owner_area_id: é uma peça só, pareada 1:1 com
-- o banner global, gerida por quem tem a capacidade 'comercial' (mesmo guard
-- do banner), não "por posse" de área.
CREATE TABLE IF NOT EXISTS commercial_banner_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name   TEXT NOT NULL,
  condition_text TEXT NOT NULL DEFAULT '',
  logo_url       TEXT NOT NULL DEFAULT '',
  order_index    INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE commercial_banner_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commercial_banner_items_admin_all" ON commercial_banner_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
