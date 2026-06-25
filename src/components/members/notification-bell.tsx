'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { getNotifications, markAllNotificationsRead } from '@/app/actions/notifications'
import type { Notification } from '@/app/actions/notifications'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from '@/lib/time'

export function NotificationBell({
  unreadCount: initialCount,
  placement = 'header',
  isAdmin = false,
}: {
  unreadCount: number
  placement?: 'header' | 'sidebar'
  isAdmin?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loaded, setLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const panelW = 320

    if (placement === 'sidebar') {
      // Abre para cima e para a direita do botão
      setPanelStyle({
        position: 'fixed',
        left: rect.right + 8,
        bottom: window.innerHeight - rect.bottom,
        width: panelW,
        zIndex: 9999,
      })
    } else {
      // Abre abaixo alinhado à direita do botão
      const right = window.innerWidth - rect.right
      setPanelStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        right: Math.max(right, 8),
        width: panelW,
        zIndex: 9999,
      })
    }
  }, [placement])

  useEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (
        buttonRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, updatePosition])

  function handleToggle() {
    if (!open && !loaded) {
      startTransition(async () => {
        const notifs = await getNotifications()
        setNotifications(notifs)
        setLoaded(true)
        if (count > 0) {
          markAllNotificationsRead()
          setCount(0)
        }
      })
    }
    setOpen((o) => !o)
  }

  const panel = open ? (
    <div
      ref={panelRef}
      style={panelStyle}
      className="bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold text-foreground">Notificações</p>
      </div>

      {isPending ? (
        <p className="px-4 py-8 text-sm text-muted-foreground text-center">Carregando...</p>
      ) : notifications.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted-foreground text-center">
          Nenhuma notificação ainda.
        </p>
      ) : (
        <ul className="max-h-80 overflow-y-auto divide-y divide-border">
          {notifications.map((n) => (
            <li key={n.id}>
              <NotificationItem notification={n} onClose={() => setOpen(false)} isAdmin={isAdmin} />
            </li>
          ))}
        </ul>
      )}
    </div>
  ) : null

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={cn(
          'relative flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
          open && 'bg-muted text-foreground'
        )}
        title="Notificações"
      >
        <Bell className={cn('w-4 h-4', count > 0 && !open && 'bell-ringing')} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {typeof document !== 'undefined' && panel && createPortal(panel, document.body)}
    </div>
  )
}

function NotificationItem({
  notification: n,
  onClose,
  isAdmin = false,
}: {
  notification: Notification
  onClose: () => void
  isAdmin?: boolean
}) {
  const inner = (
    <div
      className={cn(
        'px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer',
        !n.read_at && 'bg-primary/5'
      )}
    >
      <div className="flex items-start gap-2">
        {!n.read_at && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-tight">{n.title}</p>
          {n.body && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
          )}
          <p className="text-xs text-muted-foreground/60 mt-1">
            {formatDistanceToNow(n.created_at)}
          </p>
        </div>
      </div>
    </div>
  )

  if (n.link) {
    const href = isAdmin
      ? n.link.replace('/dashboard/comunidade/', '/admin/comunidade/')
      : n.link
    return (
      <Link href={href} onClick={onClose} className="block">
        {inner}
      </Link>
    )
  }

  return inner
}
