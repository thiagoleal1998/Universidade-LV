-- Moderação: admin pode ocultar (não excluir) um post ou resposta da
-- Comunidade. Sem mudança de RLS — a policy "Admins manage posts/replies"
-- (FOR ALL, migração 011) já libera UPDATE para admin.
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE community_replies ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;
