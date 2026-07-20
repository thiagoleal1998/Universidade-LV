import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { MessageSquare } from 'lucide-react'
import { requireContentPage } from '@/lib/authz'

type CourseRow = {
  id: string
  name: string
  description: string
  is_published: boolean
  post_count: { count: number }[]
}

export default async function AdminComunidadePage() {
  await requireContentPage()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('courses')
    .select('id, name, description, is_published, post_count:community_posts(count)')
    .order('order_index')

  const courses = (data ?? []) as unknown as CourseRow[]

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comunidade</h1>
          <p className="text-sm text-muted-foreground">Gerencie as discussões dos alunos por curso</p>
        </div>
      </div>

      {courses.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">Nenhum curso cadastrado.</p>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => {
            const postCount = course.post_count?.[0]?.count ?? 0
            return (
              <Link
                key={course.id}
                href={`/admin/comunidade/${course.id}`}
                className="flex items-center gap-4 bg-card border rounded-xl px-5 py-4 hover:border-primary/50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{course.name}</p>
                    <Badge variant={course.is_published ? 'default' : 'secondary'} className="text-xs">
                      {course.is_published ? 'Publicado' : 'Rascunho'}
                    </Badge>
                  </div>
                  {course.description && (
                    <p className="text-sm text-muted-foreground truncate">{course.description}</p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
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
