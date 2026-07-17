'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// Toca um som e mostra um toast quando chega uma notificação de novo chamado de
// feedback via Supabase Realtime. Montado uma única vez no layout do admin (não
// dentro da sidebar, que renderiza em duplicidade para mobile/desktop).
export function AdminNotificationSound({ userId }: { userId: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`admin-notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { type: string; title: string; body: string }
          if (row.type !== 'new_feedback') return
          audioRef.current?.play().catch(() => {
            // Navegadores bloqueiam autoplay sem interação prévia — silenciosamente ignora
          })
          toast.info(row.title, { description: row.body })
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, router])

  return <audio ref={audioRef} src="/sounds/new-ticket.mp3" preload="auto" />
}
