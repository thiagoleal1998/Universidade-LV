import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TripCard } from '@/components/members/trip-card'
import { CalendarDays } from 'lucide-react'

function formatPeriod(start: string | null, end: string | null): string {
  if (!start) return ''
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  if (end && end !== start) return `${fmt(start)} — ${fmt(end)}`
  return fmt(start)
}

export default async function EventosListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()
  const { data: eventosData } = await adminClient
    .from('eventos')
    .select('id, slug, title, description, cover_url, url, start_date, end_date')
    .eq('is_active', true)
    .order('start_date', { ascending: true, nullsFirst: false })

  const todayStr = new Date().toISOString().slice(0, 10)
  const eventos = (eventosData ?? []).filter((e) => (e.end_date ?? e.start_date ?? '9999-99-99') >= todayStr)

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-center gap-2 mb-1">
        <CalendarDays className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Eventos</h1>
      </div>
      <p className="text-muted-foreground mb-6">Eventos e encontros abertos para agentes de viagem.</p>

      {eventos.length === 0 ? (
        <div className="text-center py-14 bg-card border border-border rounded-xl">
          <CalendarDays className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum evento disponível no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {eventos.map((e) => (
            <TripCard
              key={e.id}
              href={`/dashboard/eventos/${e.slug ?? e.id}`}
              title={e.title}
              coverUrl={e.cover_url}
              description={e.description}
              period={formatPeriod(e.start_date, e.end_date)}
              fallbackIcon={<CalendarDays className="w-8 h-8 text-muted-foreground/40" />}
            />
          ))}
        </div>
      )}
    </div>
  )
}
