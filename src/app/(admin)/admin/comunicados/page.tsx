import { createClient } from '@/lib/supabase/server'
import { AnnouncementsManager } from '@/components/admin/announcements-manager'
import { requireAdminPage } from '@/lib/authz'

export default async function ComunicadosPage() {
  await requireAdminPage()

  const supabase = await createClient()

  const { data } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Comunicados</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Publique avisos e novidades para os membros.
        </p>
      </div>
      <AnnouncementsManager announcements={data ?? []} />
    </div>
  )
}
