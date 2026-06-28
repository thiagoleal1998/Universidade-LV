import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { BarChart2, Users, BookOpen, CheckCircle2, TrendingUp, Download, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RelatoriosMarketing } from '@/components/admin/relatorios-marketing'

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: `${value}%` }}
        />
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

export default async function RelatoriosPage() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const [
    { data: profiles },
    { data: usersData },
    { data: modulesData },
    { data: lessonsData },
    { data: progressData },
    { data: ofertasData },
    { data: laminasData },
    { data: productsData },
  ] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, active, avatar_url').order('full_name'),
    adminClient.auth.admin.listUsers(),
    supabase.from('modules').select('id, title, is_published').order('order_index'),
    supabase.from('lessons').select('id, module_id, is_published'),
    supabase.from('member_progress').select('user_id, lesson_id'),
    adminClient.from('marketing_items').select('title, product_id, audience, scope, status, created_at').eq('category', 'ofertas_diarias'),
    adminClient.from('marketing_items').select('title, audience, scope, status, created_at').eq('category', 'laminas'),
    adminClient.from('marketing_products').select('id, name'),
  ])

  const emailMap = new Map((usersData?.users ?? []).map((u) => [u.id, u.email ?? '']))

  const allProfiles = profiles ?? []
  const activeMembers = allProfiles.filter((p) => p.active && p.role !== 'admin')
  const pendingMembers = allProfiles.filter((p) => !p.active && p.role !== 'admin')
  const allModules = modulesData ?? []
  const allLessons = lessonsData ?? []
  const allProgress = progressData ?? []

  const publishedLessons = allLessons.filter((l) => l.is_published)
  const totalPublished = publishedLessons.length

  // Set of completed lesson_ids per user
  const completedByUser = new Map<string, Set<string>>()
  for (const p of allProgress) {
    if (!completedByUser.has(p.user_id)) completedByUser.set(p.user_id, new Set())
    completedByUser.get(p.user_id)!.add(p.lesson_id)
  }

  const totalCompletions = allProgress.length
  const overallRate = activeMembers.length > 0 && totalPublished > 0
    ? Math.round((totalCompletions / (activeMembers.length * totalPublished)) * 100)
    : 0

  // Per-module stats
  const moduleStats = allModules.map((mod) => {
    const modLessons = publishedLessons.filter((l) => l.module_id === mod.id)
    if (modLessons.length === 0 || activeMembers.length === 0) {
      return { ...mod, lessonCount: modLessons.length, avgCompletion: 0 }
    }
    const modLessonIds = new Set(modLessons.map((l) => l.id))
    const totalPossible = modLessons.length * activeMembers.length
    const totalCompleted = activeMembers.reduce((acc, m) => {
      const done = completedByUser.get(m.id)
      if (!done) return acc
      return acc + modLessons.filter((l) => done.has(l.id)).length
    }, 0)
    return {
      ...mod,
      lessonCount: modLessons.length,
      avgCompletion: Math.round((totalCompleted / totalPossible) * 100),
      _modLessonIds: modLessonIds,
    }
  })

  // ── Marketing / Ofertas Diárias stats ────────────────────────────────────
  const ofertas = ofertasData ?? []
  const laminas = laminasData ?? []
  const productMap = new Map((productsData ?? []).map((p: { id: string; name: string }) => [p.id, p.name]))

  const activeOfertas = ofertas.filter((i: { status?: string | null }) => i.status === 'published').length

  // Hotéis mais divulgados (group by product name or title)
  const hotelCount = new Map<string, number>()
  for (const item of ofertas) {
    const name = (item.product_id && productMap.get(item.product_id)) || (item.title as string)
    hotelCount.set(name, (hotelCount.get(name) ?? 0) + 1)
  }
  const ofertasPorHotel = [...hotelCount.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // Lâminas por audiência
  const laminasB2B = laminas.filter((i: { audience?: string | null }) => i.audience === 'B2B').length
  const laminasB2C = laminas.filter((i: { audience?: string | null }) => i.audience === 'B2C').length
  const audienciaPie = [
    { name: 'B2B', value: laminasB2B, color: '#f97316' },
    { name: 'B2C', value: laminasB2C, color: '#22c55e' },
  ]

  // Escopo Nacional vs Internacional (ofertas_diarias)
  const scopeCount: Record<string, number> = {}
  for (const item of ofertas) {
    const s = (item.scope as string | null) || 'Não informado'
    scopeCount[s] = (scopeCount[s] ?? 0) + 1
  }
  const SCOPE_COLORS: Record<string, string> = { Nacional: '#3b82f6', Internacional: '#a855f7', 'Não informado': '#94a3b8' }
  const scopePie = Object.entries(scopeCount).map(([name, value]) => ({ name, value, color: SCOPE_COLORS[name] ?? '#94a3b8' }))

  // ── Per-member stats
  const memberStats = activeMembers.map((m) => {
    const done = completedByUser.get(m.id)
    const completed = done ? publishedLessons.filter((l) => done.has(l.id)).length : 0
    const rate = totalPublished > 0 ? Math.round((completed / totalPublished) * 100) : 0
    const initials = m.full_name
      ? m.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
      : emailMap.get(m.id)?.[0]?.toUpperCase() ?? '?'
    return { ...m, completed, rate, initials, email: emailMap.get(m.id) ?? '' }
  }).sort((a, b) => b.rate - a.rate)

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Relatórios</h2>
            <p className="text-sm text-muted-foreground">Visão consolidada do engajamento e progresso.</p>
          </div>
        </div>
        <Link
          href="/api/relatorios/export"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </Link>
      </div>

      {/* ── Ofertas Diárias & Marketing ── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-5">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Ofertas Diárias & Marketing</h3>
        </div>
        <RelatoriosMarketing
          totalOfertas={ofertas.length}
          activeOfertas={activeOfertas}
          totalLaminas={laminas.length}
          laminasB2B={laminasB2B}
          laminasB2C={laminasB2C}
          ofertasPorHotel={ofertasPorHotel}
          audienciaPie={audienciaPie}
          scopePie={scopePie}
        />
      </div>

      <div className="border-t border-border mb-10" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KpiCard icon={Users} label="Membros ativos" value={activeMembers.length} sub={`${pendingMembers.length} pendentes`} />
        <KpiCard icon={BookOpen} label="Módulos" value={allModules.length} sub={`${allModules.filter(m => m.is_published).length} publicados`} />
        <KpiCard icon={CheckCircle2} label="Aulas concluídas" value={totalCompletions} sub="em todos os membros" />
        <KpiCard icon={TrendingUp} label="Taxa de conclusão" value={`${overallRate}%`} sub="média geral" />
      </div>

      {/* Progresso por módulo */}
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
                <tr>
                  <td colSpan={4} className="text-center text-muted-foreground py-8">Nenhum módulo criado.</td>
                </tr>
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

      {/* Progresso por membro */}
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
                <tr>
                  <td colSpan={5} className="text-center text-muted-foreground py-8">Nenhum membro ativo.</td>
                </tr>
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
                  <td className="px-5 py-3 text-right text-muted-foreground">
                    {m.completed}/{totalPublished}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end">
                      <ProgressBar value={m.rate} />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/membros/${m.id}`}
                      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs')}
                    >
                      Detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
