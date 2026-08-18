-- URLs bonitas pra curso/módulo/aula: troca o segmento UUID por um slug
-- legível (ex.: /dashboard/cursos/curso-de-ia-na-pratica), mantendo a
-- estrutura de rotas achatada atual — só adiciona a coluna, o resto do
-- trabalho (dual lookup id-ou-slug, backfill, geração nas create actions)
-- é feito em código, ver src/lib/slug.ts.
--
-- Nullable + UNIQUE de propósito: Postgres permite múltiplos NULL sob
-- UNIQUE, então é seguro criar a coluna ANTES do backfill rodar.

ALTER TABLE courses ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE courses ADD CONSTRAINT courses_slug_key UNIQUE (slug);

ALTER TABLE modules ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE modules ADD CONSTRAINT modules_slug_key UNIQUE (slug);

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE lessons ADD CONSTRAINT lessons_slug_key UNIQUE (slug);
