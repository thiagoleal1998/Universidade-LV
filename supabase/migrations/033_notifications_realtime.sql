-- Habilita Realtime na tabela notifications, usado pelo som/toast de novo chamado
-- de feedback para o admin. Idempotente — não falha se já estiver habilitado.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
