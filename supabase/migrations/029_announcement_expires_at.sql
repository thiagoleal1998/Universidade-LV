-- Adiciona data de expiração aos comunicados
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL;
