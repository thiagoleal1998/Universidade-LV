// Rascunho de texto guardado em sessionStorage — sobrevive a reload e
// navegação dentro da mesma aba, mas some sozinho ao fechar a aba/navegador.
// Escolhido em vez de localStorage de propósito: os componentes que usam
// isto (chamado de feedback) não têm o id do usuário disponível no cliente
// pra escopar a chave, e localStorage persiste indefinidamente — em um
// navegador compartilhado entre contas diferentes, um rascunho antigo
// vazaria pro próximo login. sessionStorage evita esse risco sem precisar
// de prop nova.
const PREFIX = 'ulv-draft:'

export function readDraft(key: string): string {
  if (typeof window === 'undefined') return ''
  try { return window.sessionStorage.getItem(PREFIX + key) ?? '' } catch { return '' }
}

export function writeDraft(key: string, value: string) {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.setItem(PREFIX + key, value) } catch { /* quota cheia, storage bloqueado, etc. */ }
}

export function clearDraft(key: string) {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.removeItem(PREFIX + key) } catch {}
}
