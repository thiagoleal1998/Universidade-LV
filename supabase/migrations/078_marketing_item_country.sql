-- País da oferta — obrigatório no servidor quando scope = 'Internacional'
-- (pedido do usuário: toda oferta internacional precisa mostrar o país pro
-- aluno, não só a cidade/produto). Texto livre, não FK — mesmo nível de
-- rigor já usado em travel_period/scope desta mesma tabela.
ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS country TEXT;
