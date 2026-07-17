import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toOne } from '@/lib/supabase/relations'
import { getMyFeedbackReports } from '@/app/actions/feedback'
import { FeedbackTicketForm } from '@/components/members/feedback-ticket-form'
import { MyFeedbackList } from '@/components/members/my-feedback-list'

export const metadata = { title: 'Feedback' }

const TESTER_TAG_NAME = 'Beta'

export default async function MemberFeedbackPage() {
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

  const reports = await getMyFeedbackReports()

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Feedback</h1>
        <p className="text-sm text-muted-foreground mt-1">Abra um chamado para reportar um bug ou enviar uma sugestão.</p>
      </div>

      <FeedbackTicketForm />

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Minhas solicitações</h2>
        <MyFeedbackList reports={reports} />
      </div>
    </div>
  )
}
