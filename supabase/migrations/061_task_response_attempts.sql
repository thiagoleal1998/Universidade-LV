-- Permite refazer uma tarefa de aula (até 3 tentativas, chamado CLV-0044).
-- Reaproveita a MESMA linha de lesson_task_responses a cada nova tentativa
-- (só incrementa attempt_number e reseta a nota) — decisão deliberada de não
-- guardar histórico de tentativas antigas, o que manteria intactas todas as
-- outras telas que já assumem "uma resposta por aluno por tarefa" (admin,
-- Notas pendentes/recebidas, KPI de "aguardando correção", Manual Interativo).
ALTER TABLE lesson_task_responses ADD COLUMN IF NOT EXISTS attempt_number INT NOT NULL DEFAULT 1;

-- Nenhuma duplicata (task_id, user_id) existia até aqui (confirmado antes de
-- aplicar) — formaliza a invariante que várias telas já assumiam sem garantia
-- nenhuma no banco (só pela UI nunca deixar submeter duas vezes).
ALTER TABLE lesson_task_responses ADD CONSTRAINT lesson_task_responses_unique_per_task UNIQUE (task_id, user_id);
