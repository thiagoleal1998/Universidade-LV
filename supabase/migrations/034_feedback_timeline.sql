-- Responsável pelo chamado, status de 3 estados e linha do tempo de eventos
-- (criação, atribuição, mudança de status, respostas), para admin e membro.

ALTER TABLE feedback_reports DROP CONSTRAINT feedback_reports_status_check;
ALTER TABLE feedback_reports ADD CONSTRAINT feedback_reports_status_check
  CHECK (status IN ('open', 'in_progress', 'resolved'));

ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS feedback_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id   UUID        NOT NULL REFERENCES feedback_reports(id) ON DELETE CASCADE,
  event_type    TEXT        NOT NULL CHECK (event_type IN ('created', 'assigned', 'status_changed', 'note_added')),
  actor_name    TEXT        NOT NULL DEFAULT '',
  from_status   TEXT,
  to_status     TEXT,
  assigned_name TEXT,
  note_text     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE feedback_events ENABLE ROW LEVEL SECURITY;

-- Membro lê a timeline dos próprios chamados
CREATE POLICY "member_read_own_feedback_events" ON feedback_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM feedback_reports WHERE id = feedback_id AND user_id = auth.uid()));

-- Admin lê a timeline de todos os chamados
CREATE POLICY "admin_read_feedback_events" ON feedback_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Sem política de INSERT — gravado só via service role (adminClient), igual a notifications.

-- Backfill: preserva o histórico que já existia antes da timeline (nota única e status resolvido)
INSERT INTO feedback_events (feedback_id, event_type, actor_name, created_at)
SELECT fr.id, 'created', COALESCE(p.full_name, ''), fr.created_at
FROM feedback_reports fr
LEFT JOIN profiles p ON p.id = fr.user_id;

INSERT INTO feedback_events (feedback_id, event_type, from_status, to_status, actor_name, created_at)
SELECT id, 'status_changed', 'open', 'resolved', 'Admin', COALESCE(resolved_at, created_at)
FROM feedback_reports WHERE status = 'resolved';

INSERT INTO feedback_events (feedback_id, event_type, actor_name, note_text, created_at)
SELECT id, 'note_added', 'Admin', admin_note, COALESCE(resolved_at, created_at)
FROM feedback_reports WHERE admin_note IS NOT NULL AND admin_note <> '';

ALTER TABLE feedback_reports DROP COLUMN admin_note;
