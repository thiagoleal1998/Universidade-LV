'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  AlertDialog, AlertDialogAction, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS, ACTIVITY_STORAGE_KEY, ACTIVITY_EVENT } from '@/lib/idle-timeout'

const NATIVE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const

// Desloga o aluno após IDLE_TIMEOUT_MS sem atividade — mousemove/teclado/scroll
// contam, mas também o heartbeat disparado pelo player de vídeo enquanto toca
// (ver study-video-player.tsx), senão quem só assiste aula sem mexer no mouse
// seria deslogado no meio do vídeo. Sincroniza entre abas via localStorage:
// atividade numa aba reseta o timer das outras, para uma aba ociosa não
// derrubar a sessão enquanto o usuário está ativo em outra.
//
// Montado uma única vez em src/app/(members)/dashboard/layout.tsx (fora da
// sidebar, que renderiza em duplicidade para mobile/desktop).
export function IdleLogoutGuard() {
  const [showWarning, setShowWarning] = useState(false)
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastResetRef = useRef(0)

  useEffect(() => {
    function scheduleTimers() {
      clearTimeout(warnTimerRef.current)
      clearTimeout(logoutTimerRef.current)
      setShowWarning(false)
      warnTimerRef.current = setTimeout(() => setShowWarning(true), IDLE_TIMEOUT_MS - IDLE_WARNING_MS)
      logoutTimerRef.current = setTimeout(doLogout, IDLE_TIMEOUT_MS)
    }

    function registerActivity(broadcast: boolean) {
      const now = Date.now()
      if (now - lastResetRef.current < 1000) return
      lastResetRef.current = now
      scheduleTimers()
      if (broadcast) localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now))
    }

    async function doLogout() {
      const supabase = createClient()
      await supabase.auth.signOut()
      // Reload completo (não router.push) — garante que qualquer canal
      // Realtime/estado em memória morre junto com a navegação.
      window.location.href = '/login?reason=idle'
    }

    const onNative = () => registerActivity(true)
    const onCustom = () => registerActivity(true)
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVITY_STORAGE_KEY) registerActivity(false)
    }

    NATIVE_EVENTS.forEach((ev) => window.addEventListener(ev, onNative, { passive: true }))
    window.addEventListener(ACTIVITY_EVENT, onCustom)
    window.addEventListener('storage', onStorage)
    scheduleTimers()

    return () => {
      NATIVE_EVENTS.forEach((ev) => window.removeEventListener(ev, onNative))
      window.removeEventListener(ACTIVITY_EVENT, onCustom)
      window.removeEventListener('storage', onStorage)
      clearTimeout(warnTimerRef.current)
      clearTimeout(logoutTimerRef.current)
    }
  }, [])

  function handleContinue() {
    window.dispatchEvent(new Event(ACTIVITY_EVENT))
  }

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Você ainda está aí?</AlertDialogTitle>
          <AlertDialogDescription>
            Por inatividade, sua sessão será encerrada em breve.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleContinue}>
            Continuar conectado
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
