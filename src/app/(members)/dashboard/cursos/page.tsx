import { createClient } from '@/lib/supabase/server'
import { BookOpen } from 'lucide-react'
import { CourseGrid } from '@/components/members/course-grid'
import type { CourseCard } from '@/components/members/course-grid'
import type { Module } from '@/lib/supabase/types'

export const metadata = { title: 'Meus Cursos' }

type LessonSummary = { id: string; is_published: boolean }
type ModuleWithLessons = Module & { lessons: LessonSummary[] }
type CourseWithModules = Course & { modules: ModuleWithLessons[] }

export default async function CursosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isAdmin = profileData?.role === 'admin'

  let accessibleCourseIds: string[] = []
  if (!isAdmin) {
    const { data: accessData } = await supabase
      .from('member_courses')
      .select('course_id')
      .eq('member_id', user!.id)
    accessibleCourseIds = (accessData ?? []).map((a) => a.course_id)
  }

  let coursesQuery = supabase
    .from('courses')
    .select('*, modules(id, title, order_index, lessons(id, is_published))')
    .eq('is_published', true)
    .order('order_index')
    .order('order_index', { referencedTable: 'modules' })

  if (!isAdmin && accessibleCourseIds.length > 0) {
    coursesQuery = coursesQuery.in('id', accessibleCourseIds)
  }

  const { data: coursesData } = isAdmin || accessibleCourseIds.length > 0
    ? await coursesQuery
    : { data: [] }

  const { data: progressData } = await supabase
    .from('member_progress')
    .select('lesson_id')
    .eq('user_id', user!.id)

  const courses = (coursesData ?? []) as CourseWithModules[]
  const completedIds = (progressData ?? []).map((p) => p.lesson_id)

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Meus Cursos</h1>

      {courses.length === 0 ? (
        <div className="text-center py-16 bg-card border rounded-xl">
          <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum curso disponível ainda.</p>
        </div>
      ) : (
        <CourseGrid
          courses={courses as CourseCard[]}
          completedIds={completedIds}
        />
      )}
    </div>
  )
}
