'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Award, NotebookPen } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/dashboard/documentos/certificados', label: 'Certificados', Icon: Award },
  { href: '/dashboard/documentos/anotacoes',    label: 'Anotações',    Icon: NotebookPen },
]

export function SubNav() {
  const pathname = usePathname()
  return (
    <>
      {ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
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
          </Link>
        )
      })}
    </>
  )
}
