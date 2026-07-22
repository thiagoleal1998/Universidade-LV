import { createAdminClient } from '@/lib/supabase/admin'
import { CreateModuleDialog } from '@/components/admin/create-module-dialog'
import { ModulesList } from '@/components/admin/modules-list'
import type { Module } from '@/lib/supabase/types'
import { requireContentPage, getPreviewAreaContext } from '@/lib/authz'

type ModuleWithCount = Module & { lessons: { count: number }[] }

export default async function ModulosPage() {
  const ctx = await requireContentPage()
  const viewCtx = await getPreviewAreaContext(ctx)

  // Todo mundo vê todos os módulos, de qualquer curso/área — editar exige
  // capacidade + posse (checado nas actions; a lista aqui não tem exclusão
  // por item, só o link de abrir o módulo, que fica sempre visível).
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('modules')
    .select('*, lessons(count)')
    .order('order_index')
  const modulesData = (data ?? []) as ModuleWithCount[]

  const canCreate = viewCtx.role === 'admin' || viewCtx.capabilities.includes('courses')

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Módulos</h2>
        {canCreate && <CreateModuleDialog />}
      </div>
      <ModulesList modules={modulesData} isAdmin={viewCtx.role === 'admin'} />
    </div>
  )
}
