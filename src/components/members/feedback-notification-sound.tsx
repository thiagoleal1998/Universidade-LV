'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { getRecentSoundNotifications } from '@/app/actions/notifications'
import { toast } from 'sonner'

const SOUND_TYPES = ['feedback_update']
const POLL_INTERVAL_MS = 15_000

// Toca um som e mostra um toast quando o admin responde ou muda o status do
// chamado de feedback do membro. Mesmo esquema híbrido Realtime+polling do
// admin (ver admin-notification-sound.tsx) — só é montado para quem tem a tag
// Beta, já que só testadores conseguem abrir chamado.
export function FeedbackNotificationSound({ userId }: { userId: string }) {
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
      .channel(`feedback-notifications-${userId}`)
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
