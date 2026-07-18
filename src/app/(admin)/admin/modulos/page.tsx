import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CreateModuleDialog } from '@/components/admin/create-module-dialog'
import { ModulesList } from '@/components/admin/modules-list'
import type { Module } from '@/lib/supabase/types'
import { requirePageCapability } from '@/lib/authz'

type ModuleWithCount = Module & { lessons: { count: number }[] }

export default async function ModulosPage() {
  const ctx = await requirePageCapability('courses')
  const isCollaborator = ctx.role === 'collaborator'

  let modulesData: ModuleWithCount[]
  if (isCollaborator) {
    // Só módulos de cursos da área do colaborador (módulo sem curso é global/admin)
    const adminClient = createAdminClient()
    const { data } = await adminClient
      .from('modules')
      .select('*, lessons(count), courses!inner(owner_area_id)')
      .eq('courses.owner_area_id', ctx.areaId!)
      .order('order_index')
    modulesData = (data ?? []) as ModuleWithCount[]
  } else {
    const supabase = await createClient()
    const { data } = await supabase
      .from('modules')
      .select('*, lessons(count)')
      .order('order_index')
    modulesData = (data ?? []) as ModuleWithCount[]
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Módulos</h2>
        <CreateModuleDialog />
      </div>
      <ModulesList modules={modulesData} isAdmin={!isCollaborator} />
    </div>
  )
}
