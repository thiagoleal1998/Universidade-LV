import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { ModuleEditor } from '@/components/admin/module-editor'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Module, Lesson } from '@/lib/supabase/types'
import { requireModulePage } from '@/lib/authz'

export default async function EditModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requireModulePage(id)

  // adminClient: precisa enxergar módulo de qualquer área (modo leitura)
  const db = createAdminClient()

  const [{ data: modData, error: modError }, { data: lessonsData }, { data: allModulesData }] = await Promise.all([
    db.from('modules').select('*').eq('id', id).single(),
    db.from('lessons').select('*').eq('module_id', id).order('order_index'),
    db.from('modules').select('id, title').order('order_index'),
  ])

  if (modError) console.error('[Admin] Erro ao buscar módulo id=%s:', id, modError)

  const mod = modData as Module | null
  const lessons = (lessonsData as Lesson[] | null) ?? []
  // Exclude the current module from the prerequisite options
  const allModules = ((allModulesData ?? []) as Pick<Module, 'id' | 'title'>[]).filter((m) => m.id !== id)

  if (!mod) notFound()

  // Módulo sem curso é global (só admin edita); com curso, posse vem do curso pai.
  let canEdit = ctx.role === 'admin'
  if (!canEdit && mod.course_id) {
    const { data: course } = await db.from('courses').select('owner_area_id').eq('id', mod.course_id).single()
    canEdit = ctx.capabilities.includes('courses') && course?.owner_area_id === ctx.areaId
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={mod.course_id ? `/admin/cursos/${mod.course_id}` : '/admin/cursos'} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
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
