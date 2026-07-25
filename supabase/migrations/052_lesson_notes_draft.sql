-- Anotação de aula passa a ter salvamento manual: o texto é guardado como
-- rascunho enquanto o aluno digita (para não perder nada), e só entra em
-- Documentos → Anotações depois que ele clica em Salvar.
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;

-- Guarda o que foi digitado desde o último "Salvar". Coluna separada de
-- content de propósito: sem isso, o rascunho sobrescreveria a versão salva e
-- um abandono no meio da edição estragaria a anotação boa que já existia.
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS draft_content TEXT;

-- Anotações que já existem foram todas salvas automaticamente antes desta
-- mudança — permanecem como salvas (is_draft = false, default acima).

-- Sem mudança de RLS: "Users manage own notes" (FOR ALL, migração 017) já
-- cobre as colunas novas.
