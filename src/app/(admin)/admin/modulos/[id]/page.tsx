import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { ModuleEditor } from '@/components/admin/module-editor'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Module, Lesson } from '@/lib/supabase/types'
import { requireModulePage, getPreviewAreaContext } from '@/lib/authz'
import { isUuid } from '@/lib/slug'

export default async function EditModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requireModulePage(id)
  const viewCtx = await getPreviewAreaContext(ctx)

  // adminClient: precisa enxergar módulo de qualquer área (modo leitura)
  const db = createAdminClient()

  // Aceita slug (URL bonita) OU o UUID antigo já persistido em notificação/
  // RD Station/push — ver src/lib/slug.ts.
  const idColumn = isUuid(id) ? 'id' : 'slug'
  const { data: modData, error: modError } = await db.from('modules').select('*').eq(idColumn, id).single()
  const mod = modData as Module | null
  if (modError) console.error('[Admin] Erro ao buscar módulo id=%s:', id, modError)
  if (!mod) notFound()

  const [{ data: lessonsData }, { data: allModulesData }, { data: courseData }] = await Promise.all([
    db.from('lessons').select('*').eq('module_id', mod.id).order('order_index'),
    db.from('modules').select('id, title').order('order_index'),
    mod.course_id
      ? db.from('courses').select('id, slug, owner_area_id').eq('id', mod.course_id).single()
      : Promise.resolve({ data: null as { id: string; slug: string | null; owner_area_id: string | null } | null }),
  ])

  const lessons = (lessonsData as Lesson[] | null) ?? []
  // Exclude the current module from the prerequisite options
  const allModules = ((allModulesData ?? []) as Pick<Module, 'id' | 'title'>[]).filter((m) => m.id !== mod.id)

  // Módulo sem curso é global (só admin edita); com curso, posse vem do curso pai.
  let canEdit = viewCtx.role === 'admin'
  if (!canEdit && mod.course_id) {
    canEdit = viewCtx.capabilities.includes('courses') && courseData?.owner_area_id === viewCtx.areaId
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={mod.course_id ? `/admin/cursos/${courseData?.slug ?? mod.course_id}` : '/admin/cursos'} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h2 className="text-2xl font-bold text-foreground">Editar Módulo</h2>
        <Badge variant={mod.is_published ? 'default' : 'secondary'}>
          {mod.is_published ? 'Publicado' : 'Rascunho'}
        </Badge>
      </div>

      <ModuleEditor mod={{ ...mod, lessons }} allModules={allModules} canEdit={canEdit} />
    </div>
  )
}
