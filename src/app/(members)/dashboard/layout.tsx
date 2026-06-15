import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { getFaqItems } from '@/app/actions/faq'
import { MemberSidebar } from '@/components/members/member-sidebar'
import { FaqWidgetWrapper } from '@/components/members/faq-widget-wrapper'
import { CommandPalette } from '@/components/members/command-palette'
import { OnboardingModal } from '@/components/members/onboarding-modal'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profileData }, settings, { count: unreadCount }, faqItems] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single(),
    getSettings(),
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null),
    getFaqItems(),
  ])

  const profile = profileData as { full_name: string; avatar_url: string } | null

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
      />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
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
