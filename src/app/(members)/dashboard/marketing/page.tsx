import { createClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { MemberMarketingView } from '@/components/members/member-marketing-view'

export const metadata = { title: 'Marketing' }

type MarketingItem = {
  id: string
  category: string
  title: string
  description: string
  content: string
  url: string
  order_index: number
}

export default async function MemberMarketingPage() {
  const supabase = await createClient()
  const settings = await getSettings()

  const { data: itemsData } = await supabase
    .from('marketing_items')
    .select('*')
    .order('order_index')

  const items = (itemsData ?? []) as MarketingItem[]

  let sections: { key: string; label: string; type: string }[] = []
  try {
    sections = JSON.parse(settings.marketing_sections)
  } catch {
    sections = []
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Marketing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Materiais e recursos para você usar com seus clientes.
        </p>
      </div>

      <MemberMarketingView sections={sections} items={items} />
    </div>
  )
}
