-- Distingue "nunca aprovado" (pendente) de "aprovado e depois desativado"
-- (inativo) — hoje as duas situações são indistinguíveis (`active=false`,
-- `rejected_at=null`), então um membro desativado pelo admin reaparecia
-- misturado na lista de "Aguardando aprovação", como se fosse cadastro novo.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Backfill: sem uma aprovação real registrada no passado, usamos sinais
-- indiretos de que o perfil já passou pela aprovação em algum momento —
-- está ativo hoje, é admin, já foi recusado (recusar também exige ter
-- passado pela fila), ou tem pelo menos um curso liberado (só acontece via
-- aprovação/atribuição manual do admin). O que sobrar sem nenhum desses
-- sinais é cadastro genuinamente pendente, e continua sem `approved_at`.
UPDATE profiles p SET approved_at = created_at
WHERE approved_at IS NULL
  AND (
    active = true
    OR role = 'admin'
    OR rejected_at IS NOT NULL
    OR EXISTS (SELECT 1 FROM member_courses mc WHERE mc.member_id = p.id)
  );
