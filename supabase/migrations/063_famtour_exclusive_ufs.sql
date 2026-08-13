-- Famtours exclusivos por UF + solicitação de acesso — mesma regra e mesma
-- modelagem já usada em training_items/training_access_requests (migração
-- 062). Array vazio = sem restrição (comportamento atual preservado).
ALTER TABLE famtours ADD COLUMN IF NOT EXISTS exclusive_ufs TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS famtour_access_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  famtour_id   UUID NOT NULL REFERENCES famtours(id) ON DELETE CASCADE,
  member_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ,
  resolved_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE (famtour_id, member_id)
);

ALTER TABLE famtour_access_requests ENABLE ROW LEVEL SECURITY;
-- Sem policy de leitura/escrita, de propósito — mesmo padrão de
-- training_access_requests: a posse é garantida pelo filtro explícito +
-- guard nas server actions via adminClient, não pela RLS.
