import Link from 'next/link'
import type { ReactNode } from 'react'
import { Calendar } from 'lucide-react'

// Card usado tanto na home (seções Famtours/Eventos) quanto nas páginas de
// lista (/dashboard/famtours, /dashboard/eventos) — evita tríplicar o mesmo
// JSX. `locked`/`lockedContent` só fazem sentido pra Famtour (Evento nunca
// passa esses props); quando ausentes, o card é sempre um link normal.
export function TripCard({
  href, title, coverUrl, description, period, fallbackIcon, locked = false, lockedContent,
}: {
  href: string
  title: string
  coverUrl: string
  description?: string
  period?: string
  fallbackIcon: ReactNode
  locked?: boolean
  lockedContent?: ReactNode
}) {
  const cover = coverUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={coverUrl} alt={title} className="w-full aspect-video object-cover" />
  ) : (
    <div className="w-full aspect-video bg-muted/40 flex items-center justify-center">{fallbackIcon}</div>
  )

  if (locked) {
    return (
      <div className="block rounded-2xl border border-amber-500/30 overflow-hidden bg-card">
        {cover}
        <div className="p-4 space-y-2">
          <p className="font-semibold text-foreground text-sm leading-snug">{title}</p>
          {period && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3 shrink-0" />
              {period}
            </span>
          )}
          {description && <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>}
          {lockedContent}
        </div>
      </div>
    )
  }

  return (
    <Link href={href} className="group block rounded-2xl border border-border overflow-hidden bg-card hover:shadow-md transition-all">
      {cover}
      <div className="p-4">
        <p className="font-semibold text-foreground text-sm leading-snug group-hover:text-primary transition-colors">{title}</p>
        {period && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Calendar className="w-3 h-3 shrink-0" />
            {period}
          </span>
        )}
        {description && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{description}</p>}
      </div>
    </Link>
  )
}
