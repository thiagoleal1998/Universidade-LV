import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { BarChart2, Users, BookOpen, CheckCircle2, TrendingUp, Download, ShoppingBag, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RelatoriosMarketing } from '@/components/admin/relatorios-marketing'
import { AtividadesTab } from '@/components/admin/atividades-log'
import { requireAdminPage } from '@/lib/authz'

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium text-foreground w-8 text-right">{value}%</span>
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon: React.ElementType }) {
  return (
    <div className="bg-card border rounded-lg p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const TABS = [
  { key: 'ensino',     label: 'Ensino',              icon: BookOpen    },
  { key: 'marketing',  label: 'Ofertas & Marketing', icon: ShoppingBag },
  { key: 'atividades', label: 'Atividades',          icon: History     },
] as const

type Tab = typeof TABS[number]['key']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MktItem = Record<string, any>

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; ator?: string; entidade?: string; acao?: string; de?: string; ate?: string; page?: string }>
}) {
  await requireAdminPage()

  const { tab: rawTab = 'ensino', ator, entidade, acao, de, ate, page } = await searchParams
  const tab: Tab = rawTab === 'marketing' ? 'marketing' : rawTab === 'atividades' ? 'atividades' : 'ensino'

  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Always fetch learning data (lightweight)
  const [
    { data: profiles },
    { data: usersData },
    { data: modulesData },
    { data: lessonsData },
    { data: progressData },
  ] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, active, avatar_url').order('full_name'),
    adminClient.auth.admin.listUsers(),
    supabase.from('modules').select('id, title, is_published').order('order_index'),
    supabase.from('lessons').select('id, module_id, is_published'),
    supabase.from('member_progress').select('user_id, lesson_id'),
  ])

  // Marketing data — fetch only on the marketing tab (or always, since it's fast)
  const [
    { data: ofertasData },
    { data: laminasData },
    { data: productsData },
  ] = await Promise.all([
    adminClient.from('marketing_items').select('*').eq('category', 'ofertas_diarias'),
    adminClient.from('marketing_items').select('*').eq('category', 'laminas'),
    adminClient.from('marketing_products').select('id, name'),
  ])

  // ── Ensino stats ──────────────────────────────────────────────────────────
  const emailMap = new Map((usersData?.users ?? []).map((u) => [u.id, u.email ?? '']))
  const allProfiles = profiles ?? []
  const activeMembers = allProfiles.filter((p) => p.active && p.role !== 'admin')
  const pendingMembers = allProfiles.filter((p) => !p.active && p.role !== 'admin')
  const allModules = modulesData ?? []
  const allLessons = lessonsData ?? []
  const allProgress = progressData ?? []
  const publishedLessons = allLessons.filter((l) => l.is_published)
  const totalPublished = publishedLessons.length

  const completedByUser = new Map<string, Set<string>>()
  for (const p of allProgress) {
    if (!completedByUser.has(p.user_id)) completedByUser.set(p.user_id, new Set())
    completedByUser.get(p.user_id)!.add(p.lesson_id)
  }

  const totalCompletions = allProgress.length
  const overallRate = activeMembers.length > 0 && totalPublished > 0
    ? Math.round((totalCompletions / (activeMembers.length * totalPublished)) * 100)
    : 0

  const moduleStats = allModules.map((mod) => {
    const modLessons = publishedLessons.filter((l) => l.module_id === mod.id)
    if (modLessons.length === 0 || activeMembers.length === 0) {
      return { ...mod, lessonCount: modLessons.length, avgCompletion: 0 }
    }
    const totalPossible = modLessons.length * activeMembers.length
    const totalCompleted = activeMembers.reduce((acc, m) => {
      const done = completedByUser.get(m.id)
      return done ? acc + modLessons.filter((l) => done.has(l.id)).length : acc
    }, 0)
    return { ...mod, lessonCount: modLessons.length, avgCompletion: Math.round((totalCompleted / totalPossible) * 100) }
  })

  const memberStats = activeMembers.map((m) => {
    const done = completedByUser.get(m.id)
    const completed = done ? publishedLessons.filter((l) => done.has(l.id)).length : 0
    const rate = totalPublished > 0 ? Math.round((completed / totalPublished) * 100) : 0
    const initials = m.full_name
      ? m.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
      : emailMap.get(m.id)?.[0]?.toUpperCase() ?? '?'
    return { ...m, completed, rate, initials, email: emailMap.get(m.id) ?? '' }
  }).sort((a, b) => b.rate - a.rate)

  // ── Marketing — dados brutos (processamento feito no cliente) ────────────
  const ofertasRaw = (ofertasData ?? []) as MktItem[]
  const laminasRaw = (laminasData ?? []) as MktItem[]
  const products = (productsData ?? []) as { id: string; name: string }[]

  return (
    <div className="p-4 md:p-8 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Relatórios</h2>
            <p className="text-sm text-muted-foreground">Visão consolidada do engajamento e marketing.</p>
          </div>
        </div>
        {tab === 'ensino' && (
          <Link href="/api/relatorios/export" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}>
            <Download className="w-4 h-4" />
            Exportar CSV
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-8">
        {TABS.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={`/admin/relatorios?tab=${key}`}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </div>

      {/* ── Aba: Ensino ── */}
      {tab === 'ensino' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <KpiCard icon={Users} label="Membros ativos" value={activeMembers.length} sub={`${pendingMembers.length} pendentes`} />
            <KpiCard icon={BookOpen} label="Módulos" value={allModules.length} sub={`${allModules.filter(m => m.is_published).length} publicados`} />
            <KpiCard icon={CheckCircle2} label="Aulas concluídas" value={totalCompletions} sub="em todos os membros" />
            <KpiCard icon={TrendingUp} label="Taxa de conclusão" value={`${overallRate}%`} sub="média geral" />
          </div>

          <div className="mb-10">
            <h3 className="text-base font-semibold text-foreground mb-3">Progresso por Módulo</h3>
            <div className="bg-card border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Módulo</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Aulas</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground text-right">Conclusão média</th>
                  </tr>
                </thead>
                <tbody>
                  {moduleStats.length === 0 && (
                    <tr><td colSpan={4} className="text-center text-muted-foreground py-8">Nenhum módulo criado.</td></tr>
                  )}
                  {moduleStats.map((mod) => (
                    <tr key={mod.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 font-medium text-foreground">{mod.title}</td>
                      <td className="px-5 py-3">
                        <Badge variant={mod.is_published ? 'default' : 'secondary'} className="text-xs">
                          {mod.is_published ? 'Publicado' : 'Rascunho'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{mod.lessonCount}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <ProgressBar value={mod.is_published ? mod.avgCompletion : 0} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-foreground mb-3">Progresso por Membro</h3>
            <div className="bg-card border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Membro</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground">Concluídas</th>
                    <th className="px-5 py-3 font-medium text-muted-foreground text-right">Progresso</th>
                    <th className="w-12 px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {memberStats.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-muted-foreground py-8">Nenhum membro ativo.</td></tr>
                  )}
                  {memberStats.map((m) => (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="text-xs bg-muted">{m.initials}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">
                            {m.full_name || <span className="italic text-muted-foreground">Sem nome</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{m.email}</td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{m.completed}/{totalPublished}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end"><ProgressBar value={m.rate} /></div>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/admin/membros/${m.id}`} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs')}>
                          Detalhes
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Aba: Ofertas & Marketing ── */}
      {tab === 'marketing' && (
        <RelatoriosMarketing
          ofertasRaw={ofertasRaw}
          laminasRaw={laminasRaw}
          products={products}
        />
      )}

      {/* ── Aba: Atividades ── */}
      {tab === 'atividades' && (
        <AtividadesTab filters={{ ator, entidade, acao, de, ate, page }} />
      )}
    </div>
  )
}
