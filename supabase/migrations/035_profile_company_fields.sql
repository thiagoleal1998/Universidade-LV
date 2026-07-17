-- Campos de perfil profissional (empresa, cargo, LinkedIn), editáveis pelo
-- próprio usuário — visível tanto na área do membro quanto do admin.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT NOT NULL DEFAULT '';
