import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Users, GraduationCap, TrendingUp, Activity, TrendingDown, Minus } from 'lucide-react'
import { DashboardTabs } from '@/components/admin/dashboard-tabs'
import { cn } from '@/lib/utils'
import type { LessonWithCount, MemberStat, ModuleStat } from '@/components/admin/dashboard-tabs'

type LessonRow = {
  id: string
  title: string
  module_id: string
  modules: { id: string; title: string } | null
}

type RecentActivity = {
  completed_at: string
  lesson_id: string
  user_id: string
  lessons: { title: string; modules: { title: string } | null } | null
  profiles: { full_name: string } | null
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalModules },
    { count: totalMembers },
    { data: lessonsData },
    { data: progressData },
    { data: membersData },
    { data: modulesData },
    { data: recentData },
    { data: recentSignups },
    { count: completionsThisWeek },
    { count: completionsPrevWeek },
    { count: newMembersThisWeek },
    { count: newMembersPrevWeek },
  ] = await Promise.all([
    supabase.from('modules').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'member'),
    supabase.from('lessons').select('id, title, module_id, modules(id, title)').eq('is_published', true),
    supabase.from('member_progress').select('lesson_id, user_id'),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'member')
      .eq('active', true),
    supabase
      .from('modules')
      .select('id, title, order_index')
      .eq('is_published', true)
      .order('order_index'),
    supabase
      .from('member_progress')
      .select('completed_at, lesson_id, user_id, lessons(title, modules(title)), profiles(full_name)')
      .order('completed_at', { ascending: false })
      .limit(10),
    supabase
      .from('profiles')
      .select('id, full_name, created_at')
      .eq('role', 'member')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('member_progress').select('*', { count: 'exact', head: true }).gte('completed_at', sevenDaysAgo),
    supabase.from('member_progress').select('*', { count: 'exact', head: true }).gte('completed_at', fourteenDaysAgo).lt('completed_at', sevenDaysAgo),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'member').gte('created_at', sevenDaysAgo),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'member').gte('created_at', fourteenDaysAgo).lt('created_at', sevenDaysAgo),
  ])

  const lessons = (lessonsData as LessonRow[] | null) ?? []
  const progress = (progressData as { lesson_id: string; user_id: string }[] | null) ?? []
  const members = (membersData as { id: string; full_name: string }[] | null) ?? []
  const modules = (modulesData as { id: string; title: string }[] | null) ?? []
  const recentActivity = (recentData as RecentActivity[] | null) ?? []
  const newSignups = (recentSignups as { id: string; full_name: string; created_at: string }[] | null) ?? []

  // completions per lesson
  const byLesson = new Map<string, number>()
  for (const p of progress) {
    byLesson.set(p.lesson_id, (byLesson.get(p.lesson_id) ?? 0) + 1)
  }

  // completions per member
  const byMember = new Map<string, number>()
  for (const p of progress) {
    byMember.set(p.user_id, (byMember.get(p.user_id) ?? 0) + 1)
  }

  const totalLessons = lessons.length
  const totalMembersActive = members.length

  // Overall completion rate
  const totalPossible = totalLessons * totalMembersActive
  const overallRate =
    totalPossible > 0 ? Math.round((progress.length / totalPossible) * 100) : 0

  // Per-module stats
  const moduleStats: ModuleStat[] = modules.map((mod) => {
    const modLessons = lessons.filter((l) => l.module_id === mod.id)
    const possible = modLessons.length * totalMembersActive
    const completed = modLessons.reduce((s, l) => s + (byLesson.get(l.id) ?? 0), 0)
    return {
      id: mod.id,
      title: mod.title,
      pct: possible > 0 ? Math.round((completed / possible) * 100) : 0,
      lessonCount: modLessons.length,
      completions: completed,
    }
  })

  // Lessons with completion count, sorted desc
  const lessonsWithCount: LessonWithCount[] = lessons
    .map((l) => ({
      id: l.id,
      title: l.title,
      moduleTitle: l.modules?.title ?? '',
      completions: byLesson.get(l.id) ?? 0,
    }))
    .sort((a, b) => b.completions - a.completions)

  // Member stats sorted desc
  const memberStats: MemberStat[] = members
    .map((m) => {
      const completed = byMember.get(m.id) ?? 0
      return {
        id: m.id,
        name: m.full_name || 'Sem nome',
        completed,
        pct: totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0,
      }
    })
    .sort((a, b) => b.completed - a.completed)

  const cw = completionsThisWeek ?? 0
  const cp = completionsPrevWeek ?? 0
  const mw = newMembersThisWeek ?? 0
  const mp = newMembersPrevWeek ?? 0

  function trend(current: number, prev: number) {
    if (prev === 0 && current === 0) return null
    if (prev === 0) return { dir: 'up', pct: 100 }
    const pct = Math.round(((current - prev) / prev) * 100)
    return { dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat', pct: Math.abs(pct) }
  }

  const completionTrend = trend(cw, cp)
  const memberTrend = trend(mw, mp)

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-2xl font-bold text-foreground mb-6">Dashboard</h2>

      {/* Main stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {[
          { label: 'Módulos', value: totalModules ?? 0, icon: BookOpen },
          { label: 'Aulas Publicadas', value: totalLessons, icon: GraduationCap },
          { label: 'Membros', value: totalMembers ?? 0, icon: Users },
          { label: 'Taxa de Conclusão', value: `${overallRate}%`, icon: TrendingUp },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly activity cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[
          { label: 'Conclusões (7 dias)', value: cw, t: completionTrend, icon: Activity },
          { label: 'Novos membros (7 dias)', value: mw, t: memberTrend, icon: Users },
        ].map(({ label, value, t, icon: Icon }) => (
          <Card key={label} className="border-dashed">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex items-end gap-3">
              <div className="text-3xl font-bold">{value}</div>
              {t && (
                <span className={cn(
                  'flex items-center gap-0.5 text-xs font-medium mb-1',
                  t.dir === 'up' ? 'text-green-600' : t.dir === 'down' ? 'text-red-500' : 'text-muted-foreground'
                )}>
                  {t.dir === 'up' ? <TrendingUp className="w-3 h-3" /> : t.dir === 'down' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {t.pct}% vs semana anterior
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <DashboardTabs
        moduleStats={moduleStats}
        lessonsWithCount={lessonsWithCount}
        memberStats={memberStats}
        totalLessons={totalLessons}
        totalMembers={totalMembersActive}
      />

      {/* Atividade recente */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas conclusões */}
        <div className="bg-card border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Últimas conclusões</h3>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conclusão ainda.</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      <span className="font-medium">{a.profiles?.full_name || 'Membro'}</span>
                      {' concluiu '}
                      <span className="text-muted-foreground">{a.lessons?.title}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.lessons?.modules?.title && `${a.lessons.modules.title} · `}
                      {new Date(a.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Novos cadastros */}
        <div className="bg-card border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Novos membros</h3>
          </div>
          {newSignups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {newSignups.map((m) => (
                <div key={m.id} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.full_name || 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
