import { getFeedbackReports } from '@/app/actions/feedback'
import { FeedbackPanel } from '@/components/admin/feedback-panel'

export const metadata = { title: 'Feedback' }

export default async function AdminFeedbackPage() {
  const reports = await getFeedbackReports()

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Feedback dos testadores</h1>
        <p className="text-sm text-muted-foreground mt-1">Bugs e sugestões enviados durante o rollout.</p>
      </div>
      <FeedbackPanel reports={reports} />
    </div>
  )
}
