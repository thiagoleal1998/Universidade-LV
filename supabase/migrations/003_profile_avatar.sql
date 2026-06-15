-- Adiciona campo de avatar ao perfil do membro
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
