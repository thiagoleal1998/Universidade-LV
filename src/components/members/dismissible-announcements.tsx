'use client'

import { useState, useEffect } from 'react'
import { Megaphone, Bell, X } from 'lucide-react'

type Announcement = { id: string; title: string; body: string; created_at: string }

const STORAGE_KEY = 'dismissed_announcements'

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch {}
  return new Set()
}

function saveDismissed(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

export function DismissibleAnnouncements({ announcements }: { announcements: Announcement[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setDismissed(loadDismissed())
    setMounted(true)
  }, [])

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveDismissed(next)
      return next
    })
  }

  const visible = announcements.filter((a) => !dismissed.has(a.id))

  if (!mounted || visible.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Bell className="w-4 h-4 text-sky-500" />
        <h2 className="text-sm font-semibold text-foreground">Comunicados</h2>
      </div>
      {visible.map((ann) => (
        <div
          key={ann.id}
          className="flex items-start gap-4 bg-sky-500/8 border-l-4 border-l-sky-500 border border-sky-500/20 rounded-xl px-5 py-4"
        >
          <div className="w-7 h-7 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <Megaphone className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-sky-900 dark:text-sky-100 text-sm">{ann.title}</p>
              <span className="text-xs text-sky-700/60 dark:text-sky-300/60 shrink-0">
                {new Date(ann.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
            </div>
            <div className="text-sm text-sky-800/80 dark:text-sky-200/80 mt-1 whitespace-pre-wrap [&_strong]:font-bold [&_em]:italic [&_u]:underline" dangerouslySetInnerHTML={{ __html: ann.body }} />
          </div>
          <button
            type="button"
            onClick={() => dismiss(ann.id)}
            className="text-sky-600/60 hover:text-sky-700 dark:text-sky-400/60 dark:hover:text-sky-300 transition-colors shrink-0 mt-0.5"
            title="Dispensar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
