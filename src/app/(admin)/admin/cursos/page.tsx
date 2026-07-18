import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CreateCourseDialog } from '@/components/admin/create-course-dialog'
import { CoursesList } from '@/components/admin/courses-list'
import type { Course } from '@/lib/supabase/types'
import { requirePageCapability } from '@/lib/authz'

type CourseWithCount = Course & { modules: { count: number }[] }

export default async function CursosPage() {
  const ctx = await requirePageCapability('courses')
  const isCollaborator = ctx.role === 'collaborator'

  // Colaborador: adminClient (a RLS esconderia rascunhos) + filtro por dono
  const db = isCollaborator ? createAdminClient() : await createClient()

  let query = db.from('courses').select('*, modules(count)').order('order_index')
  if (isCollaborator) query = query.eq('owner_area_id', ctx.areaId!)

  const { data } = await query

  const courses = (data ?? []) as CourseWithCount[]

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cursos</h2>
          <p className="text-sm text-muted-foreground mt-1">{courses.length} {courses.length === 1 ? 'curso' : 'cursos'} cadastrados</p>
        </div>
        <CreateCourseDialog />
      </div>

      <CoursesList courses={courses} isAdmin={!isCollaborator} />
    </div>
  )
}
