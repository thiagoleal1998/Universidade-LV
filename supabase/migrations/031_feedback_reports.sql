-- Reports de feedback (bug/sugestão) enviados por testadores durante o rollout faseado
CREATE TABLE IF NOT EXISTS feedback_reports (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL DEFAULT 'bug' CHECK (type IN ('bug', 'suggestion')),
  message      TEXT        NOT NULL,
  page_url     TEXT        NOT NULL DEFAULT '',
  status       TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  admin_note   TEXT        NOT NULL DEFAULT '',
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE feedback_reports ENABLE ROW LEVEL SECURITY;

-- Membro cria e lê os próprios reports
CREATE POLICY "member_insert_own_feedback" ON feedback_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "member_read_own_feedback" ON feedback_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admin lê e atualiza tudo (status/nota)
CREATE POLICY "admin_all_feedback" ON feedback_reports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
