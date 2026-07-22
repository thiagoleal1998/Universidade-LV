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
import { requireCoursePage, getPreviewAreaContext } from '@/lib/authz'
import { createAdminClient } from '@/lib/supabase/admin'

type ModuleWithCount = Module & { lessons: { count: number }[] }
type CourseWithOwner = Course & { owner_area_id: string | null }

export default async function EditCursoPpage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requireCoursePage(id)
  // viewCtx simula o modo prévia de colaborador — só afeta o que a tela mostra.
  const viewCtx = await getPreviewAreaContext(ctx)
  const isAdmin = viewCtx.role === 'admin'

  // adminClient: precisa enxergar o curso mesmo que seja de outra área
  // (colaborador agora vê tudo em modo leitura) — RLS via client de sessão
  // esconderia rascunhos de qualquer forma.
  const db = createAdminClient()

  const [{ data: courseData, error: courseError }, { data: modulesData }, { data: candidatesData }] = await Promise.all([
    db.from('courses').select('*').eq('id', id).single(),
    db.from('modules').select('*, lessons(count)').eq('course_id', id).order('order_index'),
    db.from('profiles').select('id, full_name, job_title').in('role', ['admin', 'collaborator']).eq('active', true).order('full_name'),
  ])

  if (courseError) console.error('[Admin] Erro ao buscar curso id=%s:', id, courseError)

  const course = courseData as CourseWithOwner | null
  const modules = (modulesData ?? []) as ModuleWithCount[]
  const instructorCandidates = candidatesData ?? []

  if (!course) notFound()

  const canEdit = isAdmin || (viewCtx.capabilities.includes('courses') && course.owner_area_id === viewCtx.areaId)

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

      <CourseEditor course={course} canEdit={canEdit} instructorCandidates={instructorCandidates} />

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Módulos ({modules.length})
          </h3>
          {canEdit && <CreateModuleDialog courseId={course.id} />}
        </div>

        {modules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10 bg-card border rounded-lg">
            Nenhum módulo neste curso ainda.{canEdit && ' Clique em "Novo Módulo" para começar.'}
          </p>
        ) : (
          <ModulesList modules={modules} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  )
}
