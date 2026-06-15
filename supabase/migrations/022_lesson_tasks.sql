-- Tarefa vinculada a uma aula (uma por aula)
CREATE TABLE IF NOT EXISTS lesson_tasks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id    UUID        NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL DEFAULT 'Tarefa',
  description  TEXT        NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lesson_id)
);

-- Questões da tarefa
CREATE TABLE IF NOT EXISTS lesson_task_questions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID        NOT NULL REFERENCES lesson_tasks(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL DEFAULT 'short_text'
                CHECK (type IN ('short_text', 'long_text', 'multiple_choice', 'checkboxes')),
  question    TEXT        NOT NULL DEFAULT '',
  options     JSONB       NOT NULL DEFAULT '[]'::jsonb,
  required    BOOLEAN     NOT NULL DEFAULT true,
  order_index INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Resposta do membro (uma por task por usuário)
CREATE TABLE IF NOT EXISTS lesson_task_responses (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID        NOT NULL REFERENCES lesson_tasks(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Respostas individuais por questão
CREATE TABLE IF NOT EXISTS lesson_task_answers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id    UUID NOT NULL REFERENCES lesson_task_responses(id) ON DELETE CASCADE,
  question_id    UUID NOT NULL REFERENCES lesson_task_questions(id) ON DELETE CASCADE,
  text_answer    TEXT,
  option_indices JSONB
);

-- RLS
ALTER TABLE lesson_tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_task_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_task_responses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_task_answers    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_tasks" ON lesson_tasks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "member_read_tasks" ON lesson_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM lessons l WHERE l.id = lesson_id AND l.is_published = true) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND active = true)
  );

CREATE POLICY "admin_all_questions" ON lesson_task_questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "member_read_questions" ON lesson_task_questions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lesson_tasks lt
      JOIN lessons l ON l.id = lt.lesson_id
      WHERE lt.id = task_id AND l.is_published = true
    ) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND active = true)
  );

CREATE POLICY "member_own_responses" ON lesson_task_responses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin_read_responses" ON lesson_task_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "member_own_answers" ON lesson_task_answers FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM lesson_task_responses r WHERE r.id = response_id AND r.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM lesson_task_responses r WHERE r.id = response_id AND r.user_id = auth.uid())
  );
CREATE POLICY "admin_read_answers" ON lesson_task_answers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
