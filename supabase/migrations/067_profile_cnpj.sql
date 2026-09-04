-- CNPJ da agência, coletado no cadastro (junto com o já existente `company`,
-- reaproveitado como "Nome da Agência") — obrigatório só em cadastro novo,
-- mesmo padrão de `uf`/`city` (migração 062): membro já cadastrado não é
-- travado por não ter preenchido, mas pode completar depois no próprio perfil.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cnpj TEXT NOT NULL DEFAULT '';
