import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSettings } from '@/lib/settings'
import { getFaqItems } from '@/app/actions/faq'
import { toOne } from '@/lib/supabase/relations'
import { MemberSidebar } from '@/components/members/member-sidebar'
import { FaqWidgetWrapper } from '@/components/members/faq-widget-wrapper'
import { CommandPalette } from '@/components/members/command-palette'
import { OnboardingModal } from '@/components/members/onboarding-modal'
import { AnnouncementTicker } from '@/components/members/announcement-ticker'
import { FeedbackNotificationSound } from '@/components/members/feedback-notification-sound'
import { IdleLogoutGuard } from '@/components/ui/idle-logout-guard'
import { PresenceHeartbeat } from '@/components/ui/presence-heartbeat'

const TESTER_TAG_NAME = 'Beta'

type Announcement = { id: string; title: string; body: string; created_at: string }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const adminClient = createAdminClient()
  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  const [{ data: profileData }, settings, { count: unreadCount }, faqItems, { data: announcementsData }, { data: aereoData }, { data: comercialData }, { data: userTagsData }, { data: gruposData }] = await Promise.all([
    adminClient.from('profiles').select('full_name, avatar_url').eq('id', user.id).single(),
    getSettings(),
    adminClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null),
    getFaqItems(),
    supabase
      .from('announcements')
      .select('id, title, body, created_at')
      .or(`is_published.eq.true,publish_at.lte.${now}`)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false })
      .limit(5),
    adminClient
      .from('marketing_items')
      .select('url')
      .eq('category', 'aereo')
      .neq('status', 'draft')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('order_index')
      .limit(1),
    adminClient
      .from('commercial_conditions')
      .select('id')
      .eq('is_active', true)
      .limit(1),
    adminClient.from('profile_tags').select('tag_id, tags(name)').eq('profile_id', user.id),
    adminClient
      .from('grupos')
      .select('id, start_date, end_date')
      .eq('is_active', true),
  ])

  const profile = profileData as { full_name: string; avatar_url: string } | null
  const announcements = (announcementsData ?? []) as Announcement[]
  const aereoUrl = (aereoData?.[0] as { url?: string } | undefined)?.url ?? null
  const comercialUrl = (comercialData?.[0] as { id?: string } | undefined)?.id ?? null
  const gruposActive = (gruposData ?? []).some((g) => (g.end_date ?? g.start_date ?? '9999-99-99') >= today)
  const userTagNames = new Set(
    (userTagsData ?? []).flatMap((t: { tag_id: string; tags: { name: string }[] }) => {
      const tag = toOne(t.tags)
      return tag ? [tag.name] : []
    })
  )
  const isTester = userTagNames.has(TESTER_TAG_NAME)

  return (
    <div className="flex h-screen bg-muted/30">
      <MemberSidebar
        siteName={settings.site_name}
        logoUrl={settings.logo_url}
        userName={profile?.full_name ?? ''}
        userEmail={user?.email ?? ''}
        avatarUrl={profile?.avatar_url ?? ''}
        unreadCount={unreadCount ?? 0}
        areaSubtitle={settings.member_area_subtitle}
        memberNavLabels={settings.member_nav_labels}
        memberNavOrder={settings.member_nav_order}
        podviajarActive={(() => { try { return JSON.parse(settings.podviajar)?.active === true } catch { return false } })()}
        aereoActive={!!aereoUrl}
        comercialActive={!!comercialUrl}
        gruposActive={gruposActive}
        showFeedbackButton={isTester}
      />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <AnnouncementTicker announcements={announcements} />
        {children}
      </main>
      <FaqWidgetWrapper
        items={faqItems}
        assistantName={settings.faq_assistant_name}
        assistantSubtitle={settings.faq_assistant_subtitle}
      />
      <CommandPalette />
      <OnboardingModal
        userName={profile?.full_name ?? ''}
        stepsJson={settings.onboarding_steps}
      />
      {isTester && <FeedbackNotificationSound userId={user.id} />}
      <IdleLogoutGuard />
      <PresenceHeartbeat />
    </div>
  )
}
