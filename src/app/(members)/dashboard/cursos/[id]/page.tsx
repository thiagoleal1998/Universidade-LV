import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, PlayCircle, Eye, UserCircle2 } from 'lucide-react'
import { CourseModulesAccordion } from '@/components/members/course-modules-accordion'
import { cn } from '@/lib/utils'
import type { Course, Module } from '@/lib/supabase/types'

type LessonSummary = { id: string; title: string; is_published: boolean; task_start_date: string | null; task_end_date: string | null }
type ModuleWithLessons = Module & { lessons: LessonSummary[] }
type CourseWithModules = Course & { modules: ModuleWithLessons[] }

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profileData?.role === 'admin'
  const client = isAdmin ? await createAdminClient() : supabase

  const [{ data: courseData }, { data: progressData }] = await Promise.all([
    isAdmin
      ? client
          .from('courses')
          .select('*, modules(*, lessons(id, title, is_published, task_start_date, task_end_date))')
          .eq('id', id)
          .order('order_index', { referencedTable: 'modules' })
          .single()
      : supabase
          .from('courses')
          .select('*, modules(*, lessons(id, title, is_published, task_start_date, task_end_date))')
          .eq('id', id)
          .eq('is_published', true)
          .order('order_index', { referencedTable: 'modules' })
          .single(),
    supabase.from('member_progress').select('lesson_id').eq('user_id', user.id),
  ])

  const course = courseData as CourseWithModules | null
  if (!course) notFound()

  const completedIds = (progressData ?? []).map((p) => p.lesson_id)
  const completedSet = new Set(completedIds)
  const modules = (course.modules ?? []).sort((a, b) => a.order_index - b.order_index)

  // Completed modules set for prerequisite checks
  const completedModuleIds = modules
    .filter((mod) => {
      const published = (mod.lessons ?? []).filter((l) => l.is_published)
      return published.length > 0 && published.every((l) => completedSet.has(l.id))
    })
    .map((mod) => mod.id)
  const completedModSet = new Set(completedModuleIds)

  // Overall progress — admins see all lessons, members only published
  const allLessons = modules.flatMap((m) =>
    (m.lessons ?? []).filter((l) => isAdmin || l.is_published)
  )
  const totalDone = allLessons.filter((l) => completedSet.has(l.id)).length
  const totalPct = allLessons.length > 0 ? Math.round((totalDone / allLessons.length) * 100) : 0
  const nextLesson = allLessons.find((l) => !completedSet.has(l.id)) ?? allLessons[0]

  // Default accordion module: first unlocked module with an uncompleted lesson
  const defaultOpenId = modules.find((mod) => {
    const prereqId = mod.prerequisite_module_id
    if (prereqId && !completedModSet.has(prereqId)) return false
    const lessons = (mod.lessons ?? []).filter((l) => isAdmin || l.is_published)
    return lessons.some((l) => !completedSet.has(l.id))
  })?.id ?? modules.find((mod) => {
    const prereqId = mod.prerequisite_module_id
    return !prereqId || completedModSet.has(prereqId)
  })?.id ?? null

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      {/* Admin preview banner */}
      {isAdmin && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-sm">
          <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-amber-700 dark:text-amber-300 font-medium">
            Pré-visualização de admin
          </span>
          {!course.is_published && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-400 text-xs">
              Rascunho
            </Badge>
          )}
          <Link
            href={`/admin/cursos/${id}`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'ml-auto gap-1.5 text-xs h-7')}
          >
            <ArrowLeft className="w-3 h-3" />
            Voltar ao admin
          </Link>
        </div>
      )}

      {/* Back link (members only) */}
      {!isAdmin && (
        <div>
          <Link href="/dashboard/cursos" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1.5')}>
            <ArrowLeft className="w-4 h-4" />
            Meus Cursos
          </Link>
        </div>
      )}

      {/* Cover image */}
      {course.cover_image_url && (
        <div className="relative w-full rounded-xl overflow-hidden aspect-video bg-muted">
          <Image
            src={course.cover_image_url}
            alt={course.name}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Course header */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="text-2xl font-bold text-foreground">{course.name}</h1>
          {nextLesson && (
            <Link
              href={`/dashboard/aulas/${nextLesson.id}`}
              className={cn(buttonVariants(), 'shrink-0 gap-1.5')}
            >
              <PlayCircle className="w-4 h-4" />
              {totalDone === 0 ? 'Iniciar' : totalPct === 100 ? 'Revisitar' : 'Continuar'}
            </Link>
          )}
        </div>
        {course.description && <p className="text-muted-foreground text-sm">{course.description}</p>}

        {/* Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{totalDone} de {allLessons.length} aulas concluídas</span>
            <span>{totalPct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${totalPct}%` }} />
          </div>
        </div>
      </div>

      {/* Instructor */}
      {(course.instructor_name || course.instructor_photo_url) && (
        <div className="flex items-center gap-4 px-5 py-4 bg-card border rounded-xl">
          {course.instructor_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.instructor_photo_url}
              alt={course.instructor_name ?? 'Instrutor'}
              className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-border"
            />
          ) : (
            <UserCircle2 className="w-14 h-14 text-muted-foreground shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">Instrutor(a)</p>
            <p className="font-semibold text-foreground leading-tight">{course.instructor_name}</p>
            {course.instructor_role && (
              <p className="text-sm text-muted-foreground">{course.instructor_role}</p>
            )}
          </div>
        </div>
      )}

      {/* Modules accordion */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Módulos do curso</h2>
        <CourseModulesAccordion
          modules={modules}
          completedIds={completedIds}
          completedModuleIds={completedModuleIds}
          defaultOpenId={defaultOpenId}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  )
}
