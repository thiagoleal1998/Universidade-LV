ALTER TABLE lesson_task_questions
  ADD COLUMN IF NOT EXISTS correct_options INTEGER[] NOT NULL DEFAULT '{}';
