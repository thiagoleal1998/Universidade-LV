-- Coluna para rastrear a página do Notion espelhada de cada chamado de
-- feedback, permitindo que eventos subsequentes (atribuição, mudança de
-- status, resposta) atualizem a mesma página em vez de criar uma duplicata.
ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS notion_page_id TEXT;
