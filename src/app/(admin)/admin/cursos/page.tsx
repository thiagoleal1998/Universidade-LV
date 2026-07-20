import { createAdminClient } from '@/lib/supabase/admin'
import { CreateCourseDialog } from '@/components/admin/create-course-dialog'
import { CoursesList } from '@/components/admin/courses-list'
import type { Course } from '@/lib/supabase/types'
import { requireContentPage } from '@/lib/authz'

type CourseWithCount = Course & { modules: { count: number }[]; owner_area_id: string | null }

export default async function CursosPage() {
  const ctx = await requireContentPage()

  // Todo mundo vê todos os cursos, de qualquer área — só editar/excluir exige
  // capacidade + posse (checado abaixo por curso, e de verdade nas actions).
  const db = createAdminClient()
  const { data } = await db.from('courses').select('*, modules(count)').order('order_index')
  const courses = (data ?? []) as CourseWithCount[]

  const canCreate = ctx.role === 'admin' || ctx.capabilities.includes('courses')
  const coursesWithEdit = courses.map((c) => ({
    ...c,
    canEdit: ctx.role === 'admin' || (ctx.capabilities.includes('courses') && c.owner_area_id === ctx.areaId),
  }))

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cursos</h2>
          <p className="text-sm text-muted-foreground mt-1">{courses.length} {courses.length === 1 ? 'curso' : 'cursos'} cadastrados</p>
        </div>
        {canCreate && <CreateCourseDialog />}
      </div>

      <CoursesList courses={coursesWithEdit} isAdmin={ctx.role === 'admin'} />
    </div>
  )
}
