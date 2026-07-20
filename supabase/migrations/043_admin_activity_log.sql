-- Log de atividades administrativas: registra o que admins e colaboradores
-- criam/editam/excluem/publicam/enviam no painel. Log transversal (não FK de
-- uma entidade só, ao contrário de feedback_events) — ator e entidade ficam
-- denormalizados como texto para manter o histórico legível mesmo se o autor
-- for renomeado/excluído depois (mesmo raciocínio de feedback_events, migração 034).
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name   TEXT        NOT NULL DEFAULT '',
  actor_role   TEXT        NOT NULL CHECK (actor_role IN ('admin', 'collaborator')),
  action       TEXT        NOT NULL CHECK (action IN ('create', 'update', 'delete', 'toggle', 'upload', 'reorder')),
  entity_type  TEXT        NOT NULL,
  entity_id    UUID,
  entity_label TEXT        NOT NULL DEFAULT '',
  detail       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at  ON admin_activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_entity_type ON admin_activity_log (entity_type);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_actor_id    ON admin_activity_log (actor_id);

ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_activity_log" ON admin_activity_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Sem policy de INSERT: só service role (adminClient) grava, igual feedback_events/notifications.
