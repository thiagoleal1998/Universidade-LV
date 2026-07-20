import { createAdminClient } from '@/lib/supabase/admin'
import { Users2, Calendar, ExternalLink } from 'lucide-react'

export const metadata = { title: 'Grupos' }

function formatPeriod(start: string | null, end: string | null): string {
  if (!start) return ''
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  if (end && end !== start) return `${fmt(start)} — ${fmt(end)}`
  return fmt(start)
}

export default async function GruposPage() {
  const adminClient = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data } = await adminClient
    .from('grupos')
    .select('id, title, description, cover_url, url, start_date, end_date')
    .eq('is_active', true)
    .order('start_date', { ascending: true, nullsFirst: false })

  const grupos = (data ?? []).filter((g) => (g.end_date ?? g.start_date ?? '9999-99-99') >= today)

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Users2 className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Grupos</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Condições comerciais para reservas em grupo.
        </p>
      </div>

      {grupos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Users2 className="w-10 h-10 opacity-30" />
          <p className="text-sm">Nenhum grupo disponível no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {grupos.map((g) => (
            <a
              key={g.id}
              href={g.url || undefined}
              target={g.url ? '_blank' : undefined}
              rel={g.url ? 'noreferrer' : undefined}
              className="group block rounded-2xl border border-border overflow-hidden bg-card hover:shadow-md transition-all"
            >
              {g.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.cover_url} alt={g.title} className="w-full aspect-video object-cover" />
              ) : (
                <div className="w-full aspect-video bg-muted/40 flex items-center justify-center">
                  <Users2 className="w-8 h-8 text-muted-foreground/40" />
                </div>
              )}
              <div className="p-4">
                <p className="font-semibold text-foreground text-sm leading-snug group-hover:text-primary transition-colors">
                  {g.title}
                </p>
                {(g.start_date || g.end_date) && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="w-3 h-3 shrink-0" />
                    {formatPeriod(g.start_date, g.end_date)}
                  </span>
                )}
                {g.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{g.description}</p>
                )}
                {g.url && (
                  <span className="flex items-center gap-1 text-xs text-primary mt-2">
                    <ExternalLink className="w-3 h-3" /> Saber mais
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
