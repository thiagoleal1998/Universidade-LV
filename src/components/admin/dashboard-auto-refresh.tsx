'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const REFRESH_INTERVAL_MS = 30_000

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
