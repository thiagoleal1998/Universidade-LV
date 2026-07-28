-- Autor pode solicitar a exclusão da própria discussão (post) na Comunidade,
-- mas a exclusão de verdade só acontece quando admin/colaborador dono do
-- curso aprova — evita que o autor apague sozinho uma discussão com
-- respostas de outras pessoas. Enquanto pendente, o post fica mascarado
-- para os demais membros (mesmo mecanismo de `is_hidden`), mas o autor e a
-- moderação continuam vendo o conteúdo normalmente.
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;
