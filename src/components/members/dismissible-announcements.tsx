'use client'

import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'

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
        <Bell className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Avisos</h2>
      </div>
      {visible.map((ann) => (
        <div
          key={ann.id}
          className="flex items-start gap-4 bg-card border-l-4 border-l-primary border border-border rounded-xl px-5 py-4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-foreground text-sm">{ann.title}</p>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(ann.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">{ann.body}</p>
          </div>
          <button
            type="button"
            onClick={() => dismiss(ann.id)}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
            title="Dispensar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
