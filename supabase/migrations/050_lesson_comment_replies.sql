-- Respostas a comentários de aula. NULL = comentário raiz; preenchido = resposta
-- àquele comentário. Um nível só: responder uma resposta aponta para o mesmo
-- comentário raiz (a UI resolve isso), evitando indentação infinita.
ALTER TABLE lesson_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES lesson_comments(id) ON DELETE CASCADE;

-- Apagar o comentário raiz leva as respostas junto (ON DELETE CASCADE acima).
CREATE INDEX IF NOT EXISTS lesson_comments_parent_id_idx ON lesson_comments (parent_id);

-- Sem mudança de RLS: as policies existentes são por lesson_id/user_id e já
-- cobrem as respostas, que moram na mesma tabela.
