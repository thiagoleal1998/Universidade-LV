import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toOne } from '@/lib/supabase/relations'
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
  status?: string | null
  publish_at?: string | null
  created_at?: string | null
  allowed_tag_ids?: string[] | null
  audience?: string | null
  scope?: string | null
  product_id?: string | null
  period_id?: string | null
  travel_period?: string | null
  expires_at?: string | null
}

export default async function MemberMarketingPage() {
  const supabase = await createClient()
  const settings = await getSettings()

  const { data: { user } } = await supabase.auth.getUser()
  const adminClient = createAdminClient()

  const [{ data: itemsData }, { data: userTagsData }, { data: productsData }, { data: periodsData }] = await Promise.all([
    adminClient.from('marketing_items').select('*').order('order_index'),
    adminClient.from('profile_tags').select('tag_id, tags(name)').eq('profile_id', user!.id),
    adminClient.from('marketing_products').select('id, name').order('name'),
    adminClient.from('marketing_periods').select('id, name').order('name'),
  ])

  const userTagIds = new Set((userTagsData ?? []).map((t: { tag_id: string }) => t.tag_id))
  const userTagNames = new Set(
    (userTagsData ?? []).flatMap((t: { tag_id: string; tags: { name: string }[] }) => {
      const tag = toOne(t.tags)
      return tag ? [tag.name] : []
    })
  )
  const B2C_RESTRICTED_TAGS = ['Agentes de viagens', 'Promotores', 'Agente de Viagem']
  const userIsB2CRestricted = B2C_RESTRICTED_TAGS.some((name) => userTagNames.has(name))
  const hideB2BBadge = userTagNames.has('Agente de Viagem')
  const now = new Date()

  // Supabase pode retornar uuid[] como string "{uuid1,uuid2}" dependendo do cache de schema
  function parseAllowedTags(val: unknown): string[] {
    if (!val) return []
    if (Array.isArray(val)) return val as string[]
    if (typeof val === 'string') {
      return val.replace(/^{|}$/g, '').split(',').filter(Boolean)
    }
    return []
  }

  const items = ((itemsData ?? []) as MarketingItem[]).filter((item) => {
    const status = item.status ?? 'published'
    if (status === 'draft') return false
    if (status === 'scheduled') {
      if (!item.publish_at || new Date(item.publish_at) > now) return false
    }

    if (item.expires_at && new Date(item.expires_at) < now) return false

    if (item.audience === 'B2C' && userIsB2CRestricted) return false

    const allowed = parseAllowedTags(item.allowed_tag_ids)
    if (allowed.length === 0) return true
    return allowed.some((tagId) => userTagIds.has(tagId))
  })

  const REMOVED_KEYS = ['email', 'script']
  let sections: { key: string; label: string; type: string }[] = []
  try {
    sections = (JSON.parse(settings.marketing_sections) as { key: string; label: string; type: string }[])
      .filter((s) => !REMOVED_KEYS.includes(s.key))
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

      <MemberMarketingView sections={sections} items={items} products={productsData ?? []} periods={periodsData ?? []} hideB2BBadge={hideB2BBadge} />
    </div>
  )
}
