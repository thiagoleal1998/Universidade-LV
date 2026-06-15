import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen } from 'lucide-react'
import type { Course, Module } from '@/lib/supabase/types'

type LessonSummary = { id: string; is_published: boolean }
type ModuleWithLessons = Module & { lessons: LessonSummary[] }
type CourseWithModules = Course & { modules: ModuleWithLessons[] }

export const metadata = { title: 'Cursos' }

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
    .select('*, modules(*, lessons(id, is_published))')
    .eq('is_published', true)
    .order('order_index')

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
  const completedSet = new Set((progressData ?? []).map((p) => p.lesson_id))

  function getCourseProgress(course: CourseWithModules) {
    const all = (course.modules ?? []).flatMap((m) => (m.lessons ?? []).filter((l) => l.is_published))
    const done = all.filter((l) => completedSet.has(l.id)).length
    return { total: all.length, done, pct: all.length > 0 ? Math.round((done / all.length) * 100) : 0 }
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Meus Cursos</h1>

      {courses.length === 0 ? (
        <div className="text-center py-16 bg-card border rounded-xl">
          <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum curso disponível ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const { total, done, pct } = getCourseProgress(course)
            const modCount = (course.modules ?? []).length
            return (
              <Link key={course.id} href={`/dashboard/cursos/${course.id}`} className="block group">
                <Card className="h-full hover:border-primary/50 transition-colors">
                  {course.cover_image_url && (
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={course.cover_image_url}
                        alt={course.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base group-hover:text-primary transition-colors leading-snug">
                        {course.name}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {done}/{total}
                      </Badge>
                    </div>
                    {course.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <BookOpen className="w-3 h-3" />
                      {modCount} {modCount === 1 ? 'módulo' : 'módulos'}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>Progresso</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pct === 100 ? '#22c55e' : 'hsl(var(--primary))',
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
