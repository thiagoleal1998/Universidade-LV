import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toOne } from '@/lib/supabase/relations'
import { getMyFeedbackReports } from '@/app/actions/feedback'
import { FeedbackTicketForm } from '@/components/members/feedback-ticket-form'
import { MyFeedbackList } from '@/components/members/my-feedback-list'
import { PlusCircle, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Feedback' }

const TESTER_TAG_NAME = 'Beta'

const TABS = [
  { key: 'abrir', label: 'Abrir chamado', icon: PlusCircle },
  { key: 'minhas', label: 'Minhas solicitações', icon: ListChecks },
] as const
type TabKey = typeof TABS[number]['key']

export default async function MemberFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
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

  const { tab } = await searchParams
  const activeTab: TabKey = tab === 'minhas' ? 'minhas' : 'abrir'

  const reports = await getMyFeedbackReports()

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Feedback</h1>
        <p className="text-sm text-muted-foreground mt-1">Abra um chamado para reportar um bug ou enviar uma sugestão.</p>
      </div>

      <div className="flex items-center gap-0 border-b border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={`?tab=${key}`}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
            {key === 'minhas' && reports.length > 0 && (
              <span className="text-[10px] font-bold bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                {reports.length}
              </span>
            )}
          </Link>
        ))}
      </div>

      {activeTab === 'abrir' ? (
        <FeedbackTicketForm />
      ) : (
        <MyFeedbackList reports={reports} />
      )}
    </div>
  )
}
