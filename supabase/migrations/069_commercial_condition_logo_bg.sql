-- Cor de fundo do "chip" que envolve a logo do hotel/parceiro em Condição
-- Comercial — pedido do usuário: logo branca/clara ficava invisível direto
-- sobre a foto de capa (sem fundo nenhum atrás dela). Default branco (não
-- transparente) porque é o que resolve o caso mais comum (logo escura/colorida
-- lê bem em branco); o admin troca a cor quando a logo específica precisar.
-- DEFAULT constante faz o Postgres já preencher as linhas existentes.
ALTER TABLE commercial_conditions ADD COLUMN IF NOT EXISTS logo_bg_color TEXT NOT NULL DEFAULT '#ffffff';
