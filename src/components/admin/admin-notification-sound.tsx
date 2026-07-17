'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { getRecentSoundNotifications } from '@/app/actions/notifications'
import { toast } from 'sonner'

// Tipos de notificação que merecem som + toast imediato (ação que o admin
// provavelmente quer ver na hora — chamado novo, cadastro aguardando aprovação,
// membro respondeu ou chamado foi atribuído a este admin).
const SOUND_TYPES = ['new_feedback', 'new_member_pending', 'feedback_update']
const POLL_INTERVAL_MS = 15_000

// Toca um som e mostra um toast quando chega uma notificação relevante.
// Usa Realtime como via principal (quase instantâneo quando funciona) e um
// polling leve como garantia — na prática o Realtime às vezes falha em
// entregar o evento (confirmado em testes), então sem o polling algumas
// notificações passariam batido silenciosamente.
//
// Montado uma única vez no layout do admin (não dentro da sidebar, que
// renderiza em duplicidade para mobile/desktop — evitaria som/poll em dobro).
export function AdminNotificationSound({ userId }: { userId: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const router = useRouter()
  const seenIdsRef = useRef<Set<string>>(new Set())
  const lastCheckRef = useRef<string>(new Date().toISOString())

  function fire(row: { id?: string; type: string; title: string; body: string }) {
    if (row.id) {
      if (seenIdsRef.current.has(row.id)) return
      seenIdsRef.current.add(row.id)
    }
    if (!SOUND_TYPES.includes(row.type)) return
    audioRef.current?.play().catch(() => {
      // Navegadores bloqueiam autoplay sem interação prévia — silenciosamente ignora
    })
    toast.info(row.title, { description: row.body })
    router.refresh()
  }

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { isSingleton: false }
    )

    const channel = supabase
      .channel(`admin-notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { id: string; type: string; title: string; body: string; created_at: string }
          if (row.created_at > lastCheckRef.current) lastCheckRef.current = row.created_at
          fire(row)
        }
      )
      .subscribe()

    const poll = setInterval(async () => {
      const rows = await getRecentSoundNotifications(lastCheckRef.current, SOUND_TYPES)
      for (const row of rows) {
        lastCheckRef.current = row.created_at
        fire(row)
      }
    }, POLL_INTERVAL_MS)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, router])

  return <audio ref={audioRef} src="/sounds/new-ticket.mp3" preload="auto" />
}
