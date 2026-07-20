import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { ACTIVITY_ACTION_LABELS, ACTIVITY_ENTITY_LABELS, type ActivityAction, type ActivityEntityType } from '@/lib/activity-log'
import { formatDistanceToNow } from '@/lib/time'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 30

type ActivityRow = {
  id: string
  actor_name: string
  actor_role: 'admin' | 'collaborator'
  action: ActivityAction
  entity_type: string
  entity_label: string
  detail: string | null
  created_at: string
}

export type AtividadesFilters = {
  ator?: string
  entidade?: string
  acao?: string
  de?: string
  ate?: string
  page?: string
}

function buildHref(filters: AtividadesFilters, overrides: Partial<AtividadesFilters>) {
  const params = new URLSearchParams()
  params.set('tab', 'atividades')
  const merged = { ...filters, ...overrides }
  if (merged.ator) params.set('ator', merged.ator)
  if (merged.entidade) params.set('entidade', merged.entidade)
  if (merged.acao) params.set('acao', merged.acao)
  if (merged.de) params.set('de', merged.de)
  if (merged.ate) params.set('ate', merged.ate)
  if (merged.page && merged.page !== '1') params.set('page', merged.page)
  return `/admin/relatorios?${params.toString()}`
}

export async function AtividadesTab({ filters }: { filters: AtividadesFilters }) {
  const adminClient = createAdminClient()
  const page = Math.max(1, Number(filters.page ?? '1') || 1)
  const offset = (page - 1) * PAGE_SIZE

  let query = adminClient
    .from('admin_activity_log')
    .select('id, actor_name, actor_role, action, entity_type, entity_label, detail, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (filters.ator) query = query.eq('actor_name', filters.ator)
  if (filters.entidade) query = query.eq('entity_type', filters.entidade)
  if (filters.acao) query = query.eq('action', filters.acao)
  if (filters.de) query = query.gte('created_at', filters.de)
  if (filters.ate) query = query.lte('created_at', `${filters.ate}T23:59:59`)

  const [{ data, count }, { data: actorsData }] = await Promise.all([
    query,
    adminClient.from('admin_activity_log').select('actor_name').order('actor_name'),
  ])

  const rows = (data ?? []) as ActivityRow[]
  const total = count ?? 0
  const actors = Array.from(new Set((actorsData ?? []).map((a) => a.actor_name).filter(Boolean))).sort()
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const entityOptions = Object.entries(ACTIVITY_ENTITY_LABELS) as [ActivityEntityType, string][]
  const actionOptions = Object.entries(ACTIVITY_ACTION_LABELS) as [ActivityAction, string][]

  const hasFilters = !!(filters.ator || filters.entidade || filters.acao || filters.de || filters.ate)

  return (
    <div>
      <form method="get" className="flex flex-wrap items-end gap-3 mb-6 bg-card border rounded-lg p-4">
        <input type="hidden" name="tab" value="atividades" />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Autor</label>
          <select name="ator" defaultValue={filters.ator ?? ''} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option value="">Todos</option>
            {actors.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Tipo de conteúdo</label>
          <select name="entidade" defaultValue={filters.entidade ?? ''} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option value="">Todos</option>
            {entityOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Ação</label>
          <select name="acao" defaultValue={filters.acao ?? ''} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option value="">Todas</option>
            {actionOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">De</label>
          <input type="date" name="de" defaultValue={filters.de ?? ''} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Até</label>
          <input type="date" name="ate" defaultValue={filters.ate ?? ''} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
        </div>
        <button type="submit" className={cn(buttonVariants({ size: 'sm' }))}>Filtrar</button>
        {hasFilters && (
          <Link href="/admin/relatorios?tab=atividades" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>Limpar</Link>
        )}
      </form>

      <div className="bg-card border rounded-lg overflow-hidden">
        {rows.length === 0 && (
          <p className="text-center text-muted-foreground py-10 text-sm">Nenhuma atividade registrada com esses filtros.</p>
        )}
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="px-5 py-3 flex items-start gap-3 text-sm">
              <span className="text-xs text-muted-foreground shrink-0 w-14">{formatDistanceToNow(row.created_at)}</span>
              <div className="min-w-0">
                <p className="text-foreground">
                  <span className="font-medium">{row.actor_name || 'Alguém'}</span>{' '}
                  {row.actor_role === 'collaborator' && <Badge variant="secondary" className="text-xs mr-1 align-middle">Colaborador</Badge>}
                  {ACTIVITY_ACTION_LABELS[row.action]}{' '}
                  {ACTIVITY_ENTITY_LABELS[row.entity_type as ActivityEntityType] ?? row.entity_type}{' '}
                  <span className="font-medium">&quot;{row.entity_label}&quot;</span>
                  {row.detail && <span className="text-muted-foreground"> — {row.detail}</span>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>Página {page} de {totalPages} · {total} atividades</span>
          <div className="flex gap-2">
            <Link
              href={buildHref(filters, { page: String(page - 1) })}
              aria-disabled={page <= 1}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1', page <= 1 && 'pointer-events-none opacity-50')}
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Link>
            <Link
              href={buildHref(filters, { page: String(page + 1) })}
              aria-disabled={page >= totalPages}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1', page >= totalPages && 'pointer-events-none opacity-50')}
            >
              Próxima <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
