-- Permite anexar documentos (PDF/Word/Excel/texto), não só fotos, nos chamados de feedback.
ALTER TABLE feedback_attachments ADD COLUMN IF NOT EXISTS file_name TEXT NOT NULL DEFAULT '';

-- Permite anexar arquivos também numa resposta (admin OU membro), não só na
-- abertura do chamado. NULL = anexo da abertura (feedback_reports); preenchido
-- = anexo daquele evento de resposta (feedback_events, event_type='note_added').
ALTER TABLE feedback_attachments ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES feedback_events(id) ON DELETE CASCADE;

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv'
]
WHERE id = 'feedback-attachments';
