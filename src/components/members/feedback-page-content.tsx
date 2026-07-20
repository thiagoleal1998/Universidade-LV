import Link from 'next/link'
import { FeedbackTicketForm } from '@/components/members/feedback-ticket-form'
import { MyFeedbackList } from '@/components/members/my-feedback-list'
import { PlusCircle, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FeedbackReport } from '@/app/actions/feedback'

const TABS = [
  { key: 'abrir', label: 'Abrir chamado', icon: PlusCircle },
  { key: 'minhas', label: 'Minhas solicitações', icon: ListChecks },
] as const
type TabKey = typeof TABS[number]['key']

// Conteúdo de "abrir chamado / minhas solicitações" — compartilhado entre a
// área do aluno (/dashboard/feedback) e a área do colaborador dentro do
// painel admin (/admin/feedback, quando o usuário não é admin de verdade).
export function FeedbackPageContent({ activeTab, reports }: { activeTab: TabKey; reports: FeedbackReport[] }) {
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
