-- Admin pode editar ou excluir uma mensagem (resposta) de um chamado de
-- feedback. Exclusão é "soft" — não apaga a linha nem o texto de verdade,
-- só marca `is_deleted`, pra timeline/eventos não perderem histórico e pra
-- não ter que também remover attachments em cascata. Edição sobrescreve
-- `note_text` e marca `edited_at`, exibido como "(editada)".
ALTER TABLE feedback_events ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE feedback_events ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
