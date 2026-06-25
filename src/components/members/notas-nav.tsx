'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Clock, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/dashboard/documentos/notas/pendentes', label: 'Pendentes',  Icon: Clock },
  { href: '/dashboard/documentos/notas/recebidas', label: 'Recebidas',  Icon: Star  },
]

export function NotasNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname()
  return (
    <div className="flex gap-1 border-b border-border mb-5">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        const showBadge = label === 'Pendentes' && pendingCount > 0
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
            {showBadge && (
              <span className="min-w-[1.1rem] h-[1.1rem] bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
