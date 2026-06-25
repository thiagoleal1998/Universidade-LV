import { createClient } from '@/lib/supabase/server'
import { AdminDashboardShell } from '@/components/admin/admin-dashboard-shell'
import type { ModuleStat, LessonWithCount, MemberStat } from '@/components/admin/admin-dashboard-shell'

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
    supabase.from('profiles').select('id, full_name').eq('role', 'member').eq('active', true),
    supabase.from('modules').select('id, title, order_index').eq('is_published', true).order('order_index'),
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

  const totalLessons = lessons.length
  const totalMembersActive = members.length
  const totalPossible = totalLessons * totalMembersActive
  const overallRate = totalPossible > 0 ? Math.round((progress.length / totalPossible) * 100) : 0

  const byLesson = new Map<string, number>()
  for (const p of progress) {
    byLesson.set(p.lesson_id, (byLesson.get(p.lesson_id) ?? 0) + 1)
  }

  const byMember = new Map<string, number>()
  for (const p of progress) {
    byMember.set(p.user_id, (byMember.get(p.user_id) ?? 0) + 1)
  }

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

  const lessonsWithCount: LessonWithCount[] = lessons
    .map((l) => ({
      id: l.id,
      title: l.title,
      moduleTitle: l.modules?.title ?? '',
      completions: byLesson.get(l.id) ?? 0,
    }))
    .sort((a, b) => b.completions - a.completions)

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

  // Engagement buckets based on completion %
  let bucket0 = 0, bucket1_50 = 0, bucket51_99 = 0, bucket100 = 0
  for (const m of memberStats) {
    if (m.pct === 0) bucket0++
    else if (m.pct <= 50) bucket1_50++
    else if (m.pct < 100) bucket51_99++
    else bucket100++
  }

  const engagementBuckets = [
    { label: 'Sem início',  value: bucket0,     color: 'bg-muted-foreground/50', valueColor: 'text-muted-foreground' },
    { label: '1% – 50%',   value: bucket1_50,  color: 'bg-orange-400',           valueColor: 'text-orange-500'       },
    { label: '51% – 99%',  value: bucket51_99, color: 'bg-blue-500',             valueColor: 'text-blue-600'         },
    { label: '100%',        value: bucket100,   color: 'bg-green-500',            valueColor: 'text-green-600'        },
  ]

  const transformedActivity = recentActivity.map((a) => ({
    completed_at: a.completed_at,
    lessonTitle: a.lessons?.title ?? null,
    moduleTitle: a.lessons?.modules?.title ?? null,
    memberName: a.profiles?.full_name ?? null,
  }))

  const transformedSignups = newSignups.map((m) => ({
    id: m.id,
    name: m.full_name || 'Sem nome',
    created_at: m.created_at,
  }))

  return (
    <AdminDashboardShell
      totalModules={totalModules ?? 0}
      totalLessons={totalLessons}
      totalMembersActive={totalMembersActive}
      totalMembersAll={totalMembers ?? 0}
      overallRate={overallRate}
      totalCompletions={progress.length}
      completionsThisWeek={completionsThisWeek ?? 0}
      completionsPrevWeek={completionsPrevWeek ?? 0}
      newMembersThisWeek={newMembersThisWeek ?? 0}
      newMembersPrevWeek={newMembersPrevWeek ?? 0}
      moduleStats={moduleStats}
      lessonsWithCount={lessonsWithCount}
      memberStats={memberStats}
      recentActivity={transformedActivity}
      newSignups={transformedSignups}
      engagementBuckets={engagementBuckets}
    />
  )
}
