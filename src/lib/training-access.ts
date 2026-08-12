export type AccessRequestStatus = 'none' | 'pending' | 'approved' | 'denied'

// UF batendo OU pedido aprovado destrava; exclusive_ufs vazio nunca bloqueia
// (comportamento atual, sem restrição). Usado nos 3 pontos de renderização
// do lado do membro (lista, detalhe, widget da home) pra não duplicar essa
// decisão em cada Server Component.
export function isTrainingLocked(
  item: { exclusive_ufs: string[] },
  myUf: string | null,
  requestStatus: AccessRequestStatus,
): boolean {
  if (!item.exclusive_ufs || item.exclusive_ufs.length === 0) return false
  if (myUf && item.exclusive_ufs.includes(myUf)) return false
  return requestStatus !== 'approved'
}
