import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMyFamtourAccessContext, requestFamtourAccess } from '@/app/actions/famtour-access'
import { isAccessLocked } from '@/lib/access-lock'
import { RequestAccessButton } from '@/components/members/request-access-button'
import { TripCard } from '@/components/members/trip-card'
import { Luggage } from 'lucide-react'

function formatPeriod(start: string | null, end: string | null): string {
  if (!start) return ''
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  if (end && end !== start) return `${fmt(start)} — ${fmt(end)}`
  return fmt(start)
}

export default async function FamtoursListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()
  const [{ data: famtoursData }, accessCtx] = await Promise.all([
    adminClient
      .from('famtours')
      .select('id, slug, title, description, cover_url, url, start_date, end_date, exclusive_ufs')
      .eq('is_active', true)
      .order('start_date', { ascending: true, nullsFirst: false }),
    getMyFamtourAccessContext(),
  ])

  // Famtour com data passada continua visível de propósito (não é escondido
  // do aluno) — ver mesma nota no dashboard/page.tsx. Agora separado em duas
  // seções (pedido do usuário): "Próximos" (ainda por vir) e "Realizados"
  // (já aconteceram) — sem data nenhuma cai em "Próximos" por padrão, já que
  // não há como saber se já passou.
  const todayStr = new Date().toISOString().slice(0, 10)
  const famtours = famtoursData ?? []
  const upcoming = famtours
    .filter((f) => !(f.end_date ?? f.start_date) || (f.end_date ?? f.start_date)! >= todayStr)
    .sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? ''))
  const past = famtours
    .filter((f) => (f.end_date ?? f.start_date) && (f.end_date ?? f.start_date)! < todayStr)
    .sort((a, b) => (b.end_date ?? b.start_date ?? '').localeCompare(a.end_date ?? a.start_date ?? ''))

  function renderGrid(list: typeof famtours) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {list.map((f) => {
          const requestStatus = accessCtx.requestsByFamtourId[f.id] ?? 'none'
          const locked = isAccessLocked(f, accessCtx.uf, requestStatus)
          return (
            <TripCard
              key={f.id}
              href={`/dashboard/famtours/${f.slug ?? f.id}`}
              title={f.title}
              coverUrl={f.cover_url}
              description={f.description}
              period={formatPeriod(f.start_date, f.end_date)}
              fallbackIcon={<Luggage className="w-8 h-8 text-muted-foreground/40" />}
              locked={locked}
              lockedContent={
                <RequestAccessButton
                  onRequest={requestFamtourAccess.bind(null, f.id)}
                  exclusiveUfs={f.exclusive_ufs}
                  status={requestStatus}
                />
              }
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-center gap-2 mb-1">
        <Luggage className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Famtours</h1>
      </div>
      <p className="text-muted-foreground mb-6">Viagens de familiarização abertas para agentes de viagem.</p>

      {famtours.length === 0 ? (
        <div className="text-center py-14 bg-card border border-border rounded-xl">
          <Luggage className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum famtour disponível no momento.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-foreground mb-4">Próximos Famtours</h2>
              {renderGrid(upcoming)}
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-foreground mb-4">Famtours Realizados</h2>
              {renderGrid(past)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
