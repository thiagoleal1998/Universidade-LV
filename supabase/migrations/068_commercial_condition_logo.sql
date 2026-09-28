-- Logo do hotel/parceiro em Condição Comercial — separado da capa (cover_url):
-- a capa é a foto ilustrativa do destino/hotel, a logo é o brasão da marca
-- parceira, exibida pequena por cima da capa (mesmo padrão já usado em
-- Corrida de Vendas: parceiro_logo_url).
ALTER TABLE commercial_conditions ADD COLUMN IF NOT EXISTS logo_url TEXT NOT NULL DEFAULT '';
