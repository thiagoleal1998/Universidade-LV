-- Treinamentos exclusivos por UF + solicitação de acesso.
-- Array vazio em training_items.exclusive_ufs = sem restrição (comportamento
-- atual 100% preservado, nenhuma migração de dado necessária). Mesmo tipo já
-- usado em collaborator_areas.capabilities (migração 036).
ALTER TABLE training_items ADD COLUMN IF NOT EXISTS exclusive_ufs TEXT[] NOT NULL DEFAULT '{}';

-- UF/cidade do perfil: obrigatórios só no cadastro novo (validado em código,
-- em register()) — aqui ficam opcionais (DEFAULT '') pra não quebrar quem já
-- tem conta.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS uf   TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';

-- Uma solicitação por (treinamento, membro) — reenvio após negativa é um
-- upsert que reseta pra 'pending', não uma linha nova. Histórico de
-- aprovação/negação de verdade fica em admin_activity_log via logActivity,
-- não nesta tabela (que guarda só o estado atual).
CREATE TABLE IF NOT EXISTS training_access_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id  UUID NOT NULL REFERENCES training_items(id) ON DELETE CASCADE,
  member_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ,
  resolved_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE (training_id, member_id)
);

ALTER TABLE training_access_requests ENABLE ROW LEVEL SECURITY;
-- Sem policy de leitura/escrita, de propósito — mesmo padrão de
-- push_subscriptions/rdstation_tokens/short_links: a posse é garantida pelo
-- filtro explícito + guard nas server actions via adminClient, não pela RLS.
