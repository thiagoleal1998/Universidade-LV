'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 60s, não 30s: cada router.refresh() invalida o cache do router e faz o Next
// re-prefetchar todos os <Link> visíveis (sidebar + tabela) — a 30s isso virava
// dezenas de requisições por minuto, com aborts (499) no nginx quando o
// navegador não dava conta. A janela de presença é de 3 min, então 60s continua
// mostrando "online agora" com folga.
const REFRESH_INTERVAL_MS = 60_000

// Dashboard admin e tabela de Membros são SSR puro, sem nenhum polling hoje.
// "Online agora" precisa se atualizar sozinho — router.refresh() re-executa
// o server component (page.tsx) e injeta props novas nos clients já montados,
// sem perder estado local de UI (aba ativa, filtro de busca), já que os
// componentes não desmontam. Mesmo padrão de invalidação já usado em
// admin-notification-sound.tsx (router.refresh() ao receber notificação).
export function DashboardAutoRefresh() {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [router])

  return null
}
