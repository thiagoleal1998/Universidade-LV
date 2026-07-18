import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSettings } from '@/lib/settings'
import { getAdminContext } from '@/lib/authz'
import { NAV_CAPABILITIES } from '@/lib/capabilities'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminNotificationSound } from '@/components/admin/admin-notification-sound'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const ctx = await getAdminContext()
  if (!ctx) redirect('/dashboard')

  const adminClient = createAdminClient()
  const [{ data: profileData }, settings, { count: unreadCount }] = await Promise.all([
    adminClient.from('profiles').select('full_name, avatar_url, role').eq('id', user.id).single(),
    getSettings(),
    adminClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null),
  ])

  const profile = profileData as { full_name: string; avatar_url: string; role: string } | null

  // Admin vê tudo (null = sem filtro); colaborador só os itens da área dele
  const allowedHrefs = ctx.role === 'admin'
    ? null
    : Object.entries(NAV_CAPABILITIES)
        .filter(([, caps]) => caps.some((c) => ctx.capabilities.includes(c)))
        .map(([href]) => href)

  return (
    <div className="flex h-screen bg-muted/30">
      <AdminSidebar
        siteName={settings.site_name}
        logoUrl={settings.logo_url}
        userName={profile?.full_name ?? ''}
        userEmail={user?.email ?? ''}
        avatarUrl={profile?.avatar_url ?? ''}
        navOrder={(() => { try { return JSON.parse(settings.nav_order) } catch { return [] } })()}
        unreadCount={unreadCount ?? 0}
        allowedHrefs={allowedHrefs}
      />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
      <AdminNotificationSound userId={user.id} />
    </div>
  )
}
