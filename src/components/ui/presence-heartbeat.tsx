'use client'

import { useEffect } from 'react'
import { recordHeartbeat } from '@/app/actions/presence'
import { PRESENCE_HEARTBEAT_MS } from '@/lib/presence'

// Marca o usuário logado como "online agora" gravando um heartbeat periódico.
// Diferente do IdleLogoutGuard (que detecta atividade real e só cobre
// /dashboard), este componente roda em QUALQUER área logada — /dashboard e
// /admin — e não tenta detectar atividade: só "a aba está aberta com sessão
// válida" já basta para contar como online.
//
// Montado uma única vez por layout (dashboard/layout.tsx e admin/layout.tsx),
// fora de componentes que duplicam para mobile/desktop — mesmo cuidado já
// documentado em admin-notification-sound.tsx e idle-logout-guard.tsx.
export function PresenceHeartbeat() {
  useEffect(() => {
    recordHeartbeat()
    const interval = setInterval(recordHeartbeat, PRESENCE_HEARTBEAT_MS)
    return () => clearInterval(interval)
  }, [])

  return null
}
