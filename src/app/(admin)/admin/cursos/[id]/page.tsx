import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CourseEditor } from '@/components/admin/course-editor'
import { ModulesList } from '@/components/admin/modules-list'
import { CreateModuleDialog } from '@/components/admin/create-module-dialog'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Course, Module } from '@/lib/supabase/types'
import { requireCoursePage } from '@/lib/authz'
import { createAdminClient } from '@/lib/supabase/admin'

type ModuleWithCount = Module & { lessons: { count: number }[] }

export default async function EditCursoPpage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requireCoursePage(id)
  const isAdmin = ctx.role === 'admin'

  // adminClient: a posse já foi validada no guard; para colaborador, a RLS
  // esconderia rascunhos do próprio curso via client de sessão.
  const db = createAdminClient()

  const [{ data: courseData, error: courseError }, { data: modulesData }] = await Promise.all([
    db.from('courses').select('*').eq('id', id).single(),
    db.from('modules').select('*, lessons(count)').eq('course_id', id).order('order_index'),
  ])

  if (courseError) console.error('[Admin] Erro ao buscar curso id=%s:', id, courseError)

  const course = courseData as Course | null
  const modules = (modulesData ?? []) as ModuleWithCount[]

  if (!course) notFound()

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/cursos" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h2 className="text-2xl font-bold text-foreground">Editar Curso</h2>
        <Badge variant={course.is_published ? 'default' : 'secondary'}>
          {course.is_published ? 'Publicado' : 'Rascunho'}
        </Badge>
        <Link
          href={`/dashboard/cursos/${course.id}`}
          target="_blank"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'ml-auto gap-1.5')}
        >
          <Eye className="w-3.5 h-3.5" />
          Ver prévia
        </Link>
      </div>

      <CourseEditor course={course} />

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Módulos ({modules.length})
          </h3>
          <CreateModuleDialog courseId={course.id} />
        </div>

        {modules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10 bg-card border rounded-lg">
            Nenhum módulo neste curso ainda. Clique em "Novo Módulo" para começar.
          </p>
        ) : (
          <ModulesList modules={modules} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  )
}
