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

const TESTER_TAG_NAME = 'Beta'

type Announcement = { id: string; title: string; body: string; created_at: string }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const adminClient = createAdminClient()
  const now = new Date().toISOString()
  const [{ data: profileData }, settings, { count: unreadCount }, faqItems, { data: announcementsData }, { data: aereoData }, { data: comercialData }, { data: userTagsData }] = await Promise.all([
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
      .from('marketing_items')
      .select('url')
      .eq('category', 'comercial')
      .neq('status', 'draft')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('order_index')
      .limit(1),
    adminClient.from('profile_tags').select('tag_id, tags(name)').eq('profile_id', user.id),
  ])

  const profile = profileData as { full_name: string; avatar_url: string } | null
  const announcements = (announcementsData ?? []) as Announcement[]
  const aereoUrl = (aereoData?.[0] as { url?: string } | undefined)?.url ?? null
  const comercialUrl = (comercialData?.[0] as { url?: string } | undefined)?.url ?? null
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
    </div>
  )
}
