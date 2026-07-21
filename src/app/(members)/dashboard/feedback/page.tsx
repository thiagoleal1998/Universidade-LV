import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toOne } from '@/lib/supabase/relations'
import { getMyFeedbackReports } from '@/app/actions/feedback'
import { FeedbackPageContent } from '@/components/members/feedback-page-content'

export const metadata = { title: 'Feedback' }

const TESTER_TAG_NAME = 'Beta'

export default async function MemberFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; report?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()
  const { data: userTagsData } = await adminClient.from('profile_tags').select('tag_id, tags(name)').eq('profile_id', user.id)
  const userTagNames = new Set(
    (userTagsData ?? []).flatMap((t: { tag_id: string; tags: { name: string }[] }) => {
      const tag = toOne(t.tags)
      return tag ? [tag.name] : []
    })
  )
  if (!userTagNames.has(TESTER_TAG_NAME)) redirect('/dashboard')

  const { tab, report } = await searchParams
  const activeTab = tab === 'minhas' ? 'minhas' : 'abrir'

  const reports = await getMyFeedbackReports()

  return <FeedbackPageContent activeTab={activeTab} reports={reports} initialOpenId={report ?? null} />
}
