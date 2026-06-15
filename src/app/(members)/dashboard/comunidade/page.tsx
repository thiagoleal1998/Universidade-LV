import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MessageSquare, Users } from 'lucide-react'

type CourseRow = {
  id: string
  name: string
  description: string
  post_count: { count: number }[]
}

export default async function ComunidadePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = profileData?.role === 'admin'

  let courseIds: string[] = []
  if (!isAdmin) {
    const { data: accessData } = await supabase
      .from('member_courses')
      .select('course_id')
      .eq('member_id', user.id)
    courseIds = (accessData ?? []).map((a) => a.course_id)
  }

  let query = supabase
    .from('courses')
    .select('id, name, description, post_count:community_posts(count)')
    .eq('is_published', true)
    .order('order_index')

  if (!isAdmin && courseIds.length > 0) {
    query = query.in('id', courseIds)
  }

  const { data } = isAdmin || courseIds.length > 0
    ? await query
    : { data: [] }

  const courses = (data ?? []) as unknown as CourseRow[]

  // If only one course, go straight to it
  if (courses.length === 1) redirect(`/dashboard/comunidade/${courses[0].id}`)

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comunidade</h1>
          <p className="text-sm text-muted-foreground">Escolha um curso para participar das discussões</p>
        </div>
      </div>

      {courses.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">Nenhum curso disponível.</p>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => {
            const postCount = course.post_count?.[0]?.count ?? 0
            return (
              <Link
                key={course.id}
                href={`/dashboard/comunidade/${course.id}`}
                className="flex items-center gap-4 bg-card border rounded-xl px-5 py-4 hover:border-primary/50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{course.name}</p>
                  {course.description && (
                    <p className="text-sm text-muted-foreground truncate">{course.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <Users className="w-3.5 h-3.5" />
                  {postCount} {postCount === 1 ? 'post' : 'posts'}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
