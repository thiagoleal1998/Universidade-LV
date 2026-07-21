'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Bell, ClipboardCheck, Star, Megaphone, Video, BookOpen, Bug, UserPlus, MessageSquare } from 'lucide-react'
import { getNotifications, markAllNotificationsRead } from '@/app/actions/notifications'
import type { Notification } from '@/app/actions/notifications'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from '@/lib/time'

function NotifIcon({ type }: { type: string }) {
  const base = 'w-7 h-7 rounded-lg flex items-center justify-center shrink-0'
  if (type === 'task_submitted')
    return <div className={cn(base, 'bg-amber-500/15')}><ClipboardCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /></div>
  if (type === 'task_graded')
    return <div className={cn(base, 'bg-green-500/15')}><Star className="w-3.5 h-3.5 text-green-600 dark:text-green-400" /></div>
  if (type === 'announcement')
    return <div className={cn(base, 'bg-blue-500/15')}><Megaphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /></div>
  if (type === 'new_feedback')
    return <div className={cn(base, 'bg-violet-500/15')}><Bug className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" /></div>
  if (type === 'new_member_pending')
    return <div className={cn(base, 'bg-emerald-500/15')}><UserPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /></div>
  if (type === 'feedback_update')
    return <div className={cn(base, 'bg-violet-500/15')}><MessageSquare className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" /></div>
  if (type === 'new_training' || type === 'training_replay')
    return <div className={cn(base, 'bg-purple-500/15')}><Video className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /></div>
  return <div className={cn(base, 'bg-primary/10')}><BookOpen className="w-3.5 h-3.5 text-primary" /></div>
}

export function NotificationBell({
  unreadCount: initialCount,
  placement = 'header',
  isAdmin = false,
  redirectFeedbackToAdmin,
}: {
  unreadCount: number
  placement?: 'header' | 'sidebar'
  isAdmin?: boolean
  // Admin/colaborador que estiver navegando em /dashboard (área do aluno) também
  // deve permanecer no ambiente de colaborador ao clicar numa notificação de
  // chamado — independente de onde o sino está montado (diferente de `isAdmin`,
  // que reflete só o shell atual). Default: mesmo valor de `isAdmin` (cobre o
  // sino do próprio painel admin sem precisar passar de novo).
  redirectFeedbackToAdmin?: boolean
}) {
  const feedbackToAdmin = redirectFeedbackToAdmin ?? isAdmin
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
              <NotificationItem notification={n} onClose={() => setOpen(false)} isAdmin={isAdmin} redirectFeedbackToAdmin={feedbackToAdmin} />
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
  redirectFeedbackToAdmin = isAdmin,
}: {
  notification: Notification
  onClose: () => void
  isAdmin?: boolean
  redirectFeedbackToAdmin?: boolean
}) {
  const inner = (
    <div
      className={cn(
        'px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer',
        !n.read_at && 'bg-primary/5'
      )}
    >
      <div className="flex items-start gap-3">
        <NotifIcon type={n.type} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-medium text-foreground leading-tight">{n.title}</p>
            {!n.read_at && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />
            )}
          </div>
          {n.area_tag && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-600 dark:text-violet-400 bg-violet-500/10 rounded-full px-1.5 py-0.5 mt-1">
              🏷 {n.area_tag}
            </span>
          )}
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
    let href = n.link
    if (isAdmin) href = href.replace('/dashboard/comunidade/', '/admin/comunidade/')
    if (redirectFeedbackToAdmin) href = href.replace('/dashboard/feedback', '/admin/feedback')
    return (
      <Link href={href} onClick={onClose} className="block">
        {inner}
      </Link>
    )
  }

  return inner
}
