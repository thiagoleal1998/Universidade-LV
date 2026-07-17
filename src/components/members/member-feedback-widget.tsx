'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type CSSProperties } from 'react'
import { Bug } from 'lucide-react'
import { cn } from '@/lib/utils'

// Mesmo helper de slide usado em member-sidebar.tsx, para o rótulo recolher junto com o menu
function slideText(collapsed: boolean, maxW = 180): CSSProperties {
  return {
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    maxWidth: collapsed ? 0 : maxW,
    opacity: collapsed ? 0 : 1,
    transition: collapsed
      ? 'max-width 240ms cubic-bezier(0.4,0,0.6,1), opacity 160ms ease'
      : 'max-width 280ms cubic-bezier(0.0,0,0.2,1) 60ms, opacity 200ms ease 80ms',
  }
}

type Props = {
  visible: boolean
  collapsed?: boolean
  onNavigate?: () => void
}

export function MemberFeedbackWidget({ visible, collapsed = false, onNavigate }: Props) {
  const pathname = usePathname()
  if (!visible) return null

  const href = '/dashboard/feedback'
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="mt-1.5 pt-1.5 border-t border-dashed border-violet-500/30">
      <Link
        href={href}
        onClick={onNavigate}
        title={collapsed ? 'Feedback' : undefined}
        className={cn(
          'w-full flex items-center rounded-lg font-medium transition-colors',
          collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 text-sm',
          isActive
            ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20'
            : 'text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 border border-transparent',
        )}
      >
        <Bug className="w-4 h-4 shrink-0" />
        <span style={slideText(collapsed, 140)} className="flex items-center gap-1.5 whitespace-nowrap">
          Feedback
          <span className="text-[9px] font-bold uppercase tracking-wide bg-violet-500/15 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full shrink-0">
            Beta
          </span>
        </span>
      </Link>
    </div>
  )
}
