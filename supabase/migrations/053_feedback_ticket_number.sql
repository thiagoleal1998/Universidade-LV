-- Numeração sequencial dos chamados, exibida como "CLV-0001". Usa uma
-- SEQUENCE de verdade (não MAX(ticket_number)+1 calculado na aplicação) —
-- é atômica no Postgres, então dois chamados abertos ao mesmo tempo por
-- pessoas diferentes nunca disputam o mesmo número.
ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS ticket_number INTEGER;

-- Backfill dos chamados que já existem, na ordem em que foram criados.
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn
  FROM feedback_reports
  WHERE ticket_number IS NULL
)
UPDATE feedback_reports fr SET ticket_number = numbered.rn
FROM numbered WHERE fr.id = numbered.id;

CREATE SEQUENCE IF NOT EXISTS feedback_reports_ticket_number_seq;
SELECT setval('feedback_reports_ticket_number_seq', COALESCE((SELECT MAX(ticket_number) FROM feedback_reports), 0));

ALTER TABLE feedback_reports ALTER COLUMN ticket_number SET DEFAULT nextval('feedback_reports_ticket_number_seq');
ALTER TABLE feedback_reports ALTER COLUMN ticket_number SET NOT NULL;

-- Idempotente: recriar a migração não deve falhar se a constraint já existir.
DO $$ BEGIN
  ALTER TABLE feedback_reports ADD CONSTRAINT feedback_reports_ticket_number_unique UNIQUE (ticket_number);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
