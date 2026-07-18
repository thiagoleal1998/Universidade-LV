import { getFaqItems } from '@/app/actions/faq'
import { FaqManager } from '@/components/admin/faq-manager'
import { HelpCircle } from 'lucide-react'
import { requireAdminPage } from '@/lib/authz'

export default async function AdminFaqPage() {
  await requireAdminPage()

  const items = await getFaqItems()

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <HelpCircle className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">FAQ</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Perguntas e respostas exibidas para os alunos no widget de ajuda rápida.
        </p>
      </div>

      <FaqManager initialItems={items} />
    </div>
  )
}
