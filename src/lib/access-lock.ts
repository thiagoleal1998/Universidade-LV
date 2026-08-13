// Peças genéricas de exclusividade por UF + solicitação de acesso —
// compartilhadas entre treinamento e famtour (e qualquer conteúdo futuro que
// precise da mesma regra). Nada aqui referencia uma entidade específica; o
// que muda por entidade (tabela própria, guard de posse, ação de
// solicitar/resolver) fica em src/app/actions/training-access.ts e
// famtour-access.ts, cada um com sua própria tabela.
import { UF_NAMES } from '@/lib/estado-flag'

// Quem revisa uma solicitação de acesso (treinamento OU famtour) é um
// público FIXO — admins + colaboradores desta área — independente de qual
// área é dona do conteúdo (não segue owner_area_id). Compartilhado entre
// notifyAccessReviewers (notifications.ts) e requireAccessReviewer
// (authz.ts) — os dois precisam apontar pro MESMO público, senão alguém
// notificado não consegue de fato aprovar/negar a solicitação.
export const ACCESS_REVIEWER_AREA_NAME = 'Promotor Interno'

export type AccessRequestStatus = 'none' | 'pending' | 'approved' | 'denied'

export type PendingAccessRequest = {
  id: string
  memberName: string
  company: string
  uf: string
  requestedAt: string
}

// UF batendo OU pedido aprovado destrava; exclusive_ufs vazio nunca bloqueia
// (comportamento padrão, sem restrição).
export function isAccessLocked(
  item: { exclusive_ufs: string[] },
  myUf: string | null,
  requestStatus: AccessRequestStatus,
): boolean {
  if (!item.exclusive_ufs || item.exclusive_ufs.length === 0) return false
  if (myUf && item.exclusive_ufs.includes(myUf)) return false
  return requestStatus !== 'approved'
}

// Serializado como JSON pelo client (fd.set('exclusive_ufs', JSON.stringify(arr)))
// — valida cada sigla contra UF_NAMES, ignora qualquer coisa que não seja
// uma UF real em vez de quebrar o save inteiro.
export function parseExclusiveUfs(raw: string | null): string[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .map((v) => String(v).toUpperCase().trim())
      .filter((v) => UF_NAMES[v])
  } catch {
    return []
  }
}
