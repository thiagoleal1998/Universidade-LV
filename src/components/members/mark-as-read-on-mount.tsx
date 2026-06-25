'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { markNotificationsByTypeRead } from '@/app/actions/notifications'

export function MarkAsReadOnMount({ type }: { type: string }) {
  const router = useRouter()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true
    markNotificationsByTypeRead(type).then(() => router.refresh())
  }, [type, router])

  return null
}
