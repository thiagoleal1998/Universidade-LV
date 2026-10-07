-- Lista de condições separadas por item (ex.: "Fique 4 noites e pague 3",
-- "20% OFF" etc.), pra substituir o hábito do admin de digitar
-- "========" manualmente dentro da descrição pra separar condições
-- diferentes dentro do mesmo card. Campo aditivo — `description` continua
-- existindo como texto introdutório curto; `conditions` é opcional.
alter table commercial_conditions
  add column conditions text[] not null default '{}';
