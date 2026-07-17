import Link from 'next/link'
import { getFeedbackReports } from '@/app/actions/feedback'
import { FeedbackPanel } from '@/components/admin/feedback-panel'
import { buttonVariants } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'

export const metadata = { title: 'Feedback' }

export default async function AdminFeedbackPage() {
  const reports = await getFeedbackReports()

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Feedback dos testadores</h1>
          <p className="text-sm text-muted-foreground mt-1">Bugs e sugestões enviados durante o rollout.</p>
        </div>
        <Link href="/dashboard/feedback?tab=abrir" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          <PlusCircle className="w-4 h-4 mr-1.5" />
          Abrir meu chamado
        </Link>
      </div>
      <FeedbackPanel reports={reports} />
    </div>
  )
}
