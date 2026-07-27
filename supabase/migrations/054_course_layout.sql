-- Segundo formato de curso: "manual interativo" (leitura contínua, menu
-- lateral, busca, zoom em imagem) — ver plano em
-- C:\Users\thiago.leal\.claude\plans\recursive-painting-wave.md.
--
-- NOT NULL DEFAULT 'padrao': todo curso já existente fica marcado como
-- 'padrao' automaticamente, sem nenhum UPDATE explícito em dado existente —
-- é o que garante que nenhum curso atual muda de comportamento.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS layout TEXT NOT NULL DEFAULT 'padrao';

-- Idempotente: recriar a migração não deve falhar se a constraint já existir.
DO $$ BEGIN
  ALTER TABLE courses ADD CONSTRAINT courses_layout_check CHECK (layout IN ('padrao', 'manual'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
