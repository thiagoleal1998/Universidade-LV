import { createClient } from '@/lib/supabase/server'
import { CreateModuleDialog } from '@/components/admin/create-module-dialog'
import { ModulesList } from '@/components/admin/modules-list'
import type { Module } from '@/lib/supabase/types'

type ModuleWithCount = Module & { lessons: { count: number }[] }

export default async function ModulosPage() {
  const supabase = await createClient()

  const { data: modulesData } = await supabase
    .from('modules')
    .select('*, lessons(count)')
    .order('order_index')

  const modules = (modulesData ?? []) as ModuleWithCount[]

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Módulos</h2>
        <CreateModuleDialog />
      </div>
      <ModulesList modules={modules} />
    </div>
  )
}
