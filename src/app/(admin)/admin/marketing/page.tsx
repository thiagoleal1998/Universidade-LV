import { createClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { MarketingTabs } from '@/components/admin/marketing-tabs'
import type { MarketingSection } from '@/components/admin/marketing-manager'
import { getTrainingItems } from '@/app/actions/training'

const REMOVED_KEYS = ['email', 'script']

function parseSections(json: string): MarketingSection[] {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed) && parsed.length > 0)
      return parsed.filter((s: MarketingSection) => !REMOVED_KEYS.includes(s.key))
  } catch {}
  return []
}

export default async function MarketingPage() {
  const supabase = await createClient()

  const [{ data }, settings, trainingItems] = await Promise.all([
    supabase.from('marketing_items').select('*').order('order_index'),
    getSettings(),
    getTrainingItems(),
  ])

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <MarketingTabs
        marketingItems={data ?? []}
        sections={parseSections(settings.marketing_sections)}
        trainingItems={trainingItems}
      />
    </div>
  )
}
