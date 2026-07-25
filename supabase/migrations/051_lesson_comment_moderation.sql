-- Moderação de comentários de aula: admin e colaborador dono do curso podem
-- fixar (sobe para o topo) e ocultar (sem excluir — autor ainda vê o próprio).
ALTER TABLE lesson_comments ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE lesson_comments ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

-- Sem policy de UPDATE de propósito: lesson_comments nunca teve uma (migração
-- 003 só cobre SELECT/INSERT/DELETE), e a moderação roda via adminClient
-- depois do guard requireLessonAccess na action — mesmo padrão do resto do
-- projeto. Um UPDATE pelo client de sessão falharia em silêncio.
