import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { toOne } from '@/lib/supabase/relations'
import { getFeedbackReports, getAdmins, getMyFeedbackReports } from '@/app/actions/feedback'
import { FeedbackPanel } from '@/components/admin/feedback-panel'
import { FeedbackPageContent } from '@/components/members/feedback-page-content'
import { buttonVariants } from '@/components/ui/button'
import { ArrowLeft, PlusCircle } from 'lucide-react'
import { requireContentPage } from '@/lib/authz'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Feedback' }

const TESTER_TAG_NAME = 'Beta'

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const ctx = await requireContentPage()
  const { tab } = await searchParams

  if (ctx.role !== 'admin') {
    // Colaborador vê a mesma experiência do membro (abrir chamado / minhas
    // solicitações) — continua exigindo a tag Beta, igual a qualquer membro.
    const adminClient = createAdminClient()
    const { data: userTagsData } = await adminClient.from('profile_tags').select('tag_id, tags(name)').eq('profile_id', ctx.userId)
    const userTagNames = new Set(
      (userTagsData ?? []).flatMap((t: { tag_id: string; tags: { name: string }[] }) => {
        const tag = toOne(t.tags)
        return tag ? [tag.name] : []
      })
    )
    if (!userTagNames.has(TESTER_TAG_NAME)) redirect('/admin')

    const activeTab = tab === 'minhas' ? 'minhas' : 'abrir'
    const reports = await getMyFeedbackReports()
    return <FeedbackPageContent activeTab={activeTab} reports={reports} />
  }

  // Admin abrindo o próprio chamado (via "Abrir meu chamado" abaixo) — continua
  // em /admin/feedback (mesma rota, só troca o que renderiza), em vez de sair
  // pra /dashboard/feedback como fazia antes.
  if (tab === 'abrir' || tab === 'minhas') {
    const reports = await getMyFeedbackReports()
    return (
      <div className="p-4 md:p-8">
        <Link href="/admin/feedback" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1.5 mb-2 -ml-2')}>
          <ArrowLeft className="w-4 h-4" />
          Voltar para a fila de chamados
        </Link>
        <FeedbackPageContent activeTab={tab} reports={reports} />
      </div>
    )
  }

  const [reports, admins] = await Promise.all([getFeedbackReports(), getAdmins()])

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Feedback dos testadores</h1>
          <p className="text-sm text-muted-foreground mt-1">Bugs e sugestões enviados durante o rollout.</p>
        </div>
        <Link href="/admin/feedback?tab=abrir" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          <PlusCircle className="w-4 h-4 mr-1.5" />
          Abrir meu chamado
        </Link>
      </div>
      <FeedbackPanel reports={reports} admins={admins} />
    </div>
  )
}
