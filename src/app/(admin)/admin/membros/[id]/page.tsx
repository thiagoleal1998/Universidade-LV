import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toOne } from '@/lib/supabase/relations'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle2, BookOpen, Clock, Flame, BarChart2, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { requireAdminPage } from '@/lib/authz'

type ProgressRow = {
  lesson_id: string
  completed_at: string
  lessons: {
    title: string
    modules: {
      title: string
    }[]
  }[]
}
type CourseRow = { id: string; name: string; modules: { id: string; title: string; lessons: { id: string; is_published: boolean }[] }[] }

function calcStreak(rows: { completed_at: string }[]) {
  if (!rows.length) return 0
  const days = [...new Set(rows.map((r) => r.completed_at.slice(0, 10)))].sort().reverse()
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  if (days[0] !== today && days[0] !== yesterday) return 0
  let streak = 1
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i - 1]).getTime() - new Date(days[i]).getTime()) / 86_400_000
    if (diff === 1) streak++
    else break
  }
  return streak
}

export default async function AdminMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage()

  const { id } = await params
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const [
    { data: profileData },
    { data: userAuth },
    { data: tagsData },
    { data: profileTagsData },
    { data: memberCoursesData },
    { data: progressData },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    adminClient.auth.admin.getUserById(id),
    supabase.from('tags').select('id, name'),
    supabase.from('profile_tags').select('tag_id').eq('profile_id', id),
    supabase.from('member_courses').select('course_id').eq('member_id', id),
    supabase.from('member_progress').select('lesson_id, completed_at, lessons(title, modules(title))').eq('user_id', id).order('completed_at', { ascending: false }),
  ])

  if (!profileData) notFound()

  const email = userAuth?.user?.email ?? ''
  const profile = profileData as { full_name: string; avatar_url: string; created_at: string; active: boolean; role: string }
  const tagIds = new Set((profileTagsData ?? []).map((t) => t.tag_id))
  const memberTags = (tagsData ?? []).filter((t) => tagIds.has(t.id))
  const courseIds = (memberCoursesData ?? []).map((mc) => mc.course_id)
  const progress = (progressData ?? []) as ProgressRow[]
  const completedSet = new Set(progress.map((p) => p.lesson_id))

  const { data: coursesRaw } = courseIds.length > 0
    ? await supabase.from('courses').select('id, name, modules(id, title, lessons(id, is_published))').in('id', courseIds).eq('is_published', true).order('order_index')
    : { data: [] }

  const courses = (coursesRaw ?? []) as CourseRow[]
  const totalLessons = courses.flatMap((c) => c.modules.flatMap((m) => m.lessons.filter((l) => l.is_published))).length
  const totalDone = completedSet.size
  const overallPct = totalLessons > 0 ? Math.round((totalDone / totalLessons) * 100) : 0
  const streak = calcStreak(progress)
  const estimatedMinutes = totalDone * 10

  const initials = profile.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : email[0]?.toUpperCase() ?? '?'

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link href="/admin/membros" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Voltar para Membros
      </Link>

      <div className="bg-card border rounded-2xl p-5 md:p-6 mb-6 flex flex-col sm:flex-row items-start gap-5">
        <Avatar className="w-16 h-16 shrink-0">
          <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-foreground">{profile.full_name || 'Sem nome'}</h1>
            <Badge variant={profile.active ? 'default' : 'secondary'} className="text-xs">{profile.active ? 'Ativo' : 'Inativo'}</Badge>
            {profile.role === 'admin' && <Badge className="text-xs bg-orange-500 text-white border-0">Admin</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{email}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Membro desde {new Date(profile.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
          {memberTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {memberTags.map((t) => (
                <span key={t.id} className="text-xs bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full border border-border">{t.name}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {([
          { icon: CheckCircle2, label: 'Aulas concluídas', value: totalDone, color: 'text-green-600' },
          { icon: BarChart2, label: 'Progresso geral', value: `${overallPct}%`, color: 'text-primary' },
          { icon: BookOpen, label: 'Cursos liberados', value: courses.length, color: 'text-blue-600' },
          { icon: streak > 0 ? Flame : Clock, label: streak > 0 ? 'Dias seguidos' : 'Horas est.', value: streak > 0 ? streak : estimatedMinutes >= 60 ? `${Math.floor(estimatedMinutes / 60)}h` : `${estimatedMinutes}m`, color: streak > 0 ? 'text-orange-500' : 'text-muted-foreground' },
        ] as const).map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-card border rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className={cn('w-3.5 h-3.5', color)} />
              <span className="text-xs text-muted-foreground truncate">{label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground text-sm">Progresso por Curso</h2>
          </div>
          {courses.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum curso liberado.</div>
          ) : (
            <div className="divide-y divide-border">
              {courses.map((course) => {
                const allLessons = course.modules.flatMap((m) => m.lessons.filter((l) => l.is_published))
                const done = allLessons.filter((l) => completedSet.has(l.id)).length
                const pct = allLessons.length > 0 ? Math.round((done / allLessons.length) * 100) : 0
                return (
                  <div key={course.id} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-foreground truncate">{course.name}</p>
                      <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-2', pct === 100 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground')}>
                        {done}/{allLessons.length}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-green-500' : 'bg-primary')} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{pct}% concluído</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-card border rounded-2xl overflow-hidden">
  <div className="px-5 py-4 border-b border-border flex items-center gap-2">
    <Activity className="w-4 h-4 text-primary" />
    <h2 className="font-semibold text-foreground text-sm">
      Atividade Recente
    </h2>
  </div>

  {progress.length === 0 ? (
    <div className="px-5 py-8 text-center text-sm text-muted-foreground">
      Nenhuma atividade registrada.
    </div>
  ) : (
    <div className="divide-y divide-border">
      {progress.slice(0, 10).map((a, i) => {
        const lesson = toOne(a.lessons)
        const module = toOne(lesson?.modules)

        return (
          <div key={i} className="px-5 py-3 flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">
                {lesson?.title ?? "Aula concluída"}
              </p>

              {module?.title && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {module.title}
                </p>
              )}
            </div>

            <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
              {new Date(a.completed_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          </div>
        )
      })}
    </div>
  )}
</div>
              </div>
    </div>
  )
}
