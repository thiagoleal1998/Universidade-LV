import { createAdminClient } from '@/lib/supabase/admin'
import { AnnouncementsManager } from '@/components/admin/announcements-manager'
import { requireContentPage } from '@/lib/authz'

export default async function ComunicadosPage() {
  const ctx = await requireContentPage()

  // adminClient sempre: RLS de announcements é admin-only estrita, e
  // colaborador precisa ver rascunhos/agendados igual ao admin.
  const adminClient = createAdminClient()

  const { data } = await adminClient
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
      <AnnouncementsManager announcements={data ?? []} isAdmin={ctx.role === 'admin'} />
    </div>
  )
}
