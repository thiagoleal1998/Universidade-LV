-- Transforma o feedback simples em um "chamado": título, link relacionado e anexos (fotos)
ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE feedback_reports ADD COLUMN IF NOT EXISTS link_url TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS feedback_attachments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id  UUID        NOT NULL REFERENCES feedback_reports(id) ON DELETE CASCADE,
  storage_path TEXT        NOT NULL,
  mime_type    TEXT        NOT NULL DEFAULT 'application/octet-stream',
  size_bytes   BIGINT      NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE feedback_attachments ENABLE ROW LEVEL SECURITY;

-- Membro insere/lê anexos apenas dos próprios chamados
CREATE POLICY "member_insert_own_feedback_attachments" ON feedback_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM feedback_reports r WHERE r.id = feedback_id AND r.user_id = auth.uid()));
CREATE POLICY "member_read_own_feedback_attachments" ON feedback_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM feedback_reports r WHERE r.id = feedback_id AND r.user_id = auth.uid()));

-- Admin lê e gerencia tudo
CREATE POLICY "admin_all_feedback_attachments" ON feedback_attachments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Bucket para fotos anexadas (mesmo padrão de task-submissions: público, 10MB, só imagens)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('feedback-attachments', 'feedback-attachments', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "members can upload feedback attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'feedback-attachments');

CREATE POLICY "authenticated can read feedback attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'feedback-attachments');

CREATE POLICY "members can delete own feedback attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'feedback-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
