import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSettings } from '@/lib/settings'
import { requirePageCapability } from '@/lib/authz'
import { MARKETING_CAPABILITIES } from '@/lib/capabilities'
import { MarketingTabs } from '@/components/admin/marketing-tabs'
import type { MarketingSection } from '@/components/admin/marketing-manager'
import { getTrainingItems } from '@/app/actions/training'
import { getMarketingProducts, getMarketingPeriods } from '@/app/actions/marketing'

const REMOVED_KEYS = ['email', 'script']

function parseSections(json: string): MarketingSection[] {
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed) && parsed.length > 0)
      return parsed.filter((s: MarketingSection) => !REMOVED_KEYS.includes(s.key))
  } catch {}
  return []
}

// Capacidade → aba da tela. Premiação e PodViajar gravam settings globais
// e ficam admin-only.
const CAP_TO_TAB: Record<string, string> = {
  marketing: 'marketing',
  trainings: 'treinamentos',
  comercial: 'comercial',
  aereo: 'aereo',
}

export default async function MarketingPage() {
  const ctx = await requirePageCapability(MARKETING_CAPABILITIES)

  const supabase = await createClient()
  const isCollaborator = ctx.role === 'collaborator'

  // Colaborador: queries via adminClient (RLS de rascunhos é admin-only) com
  // filtro explícito por dono — só vê o conteúdo da própria área.
  const db = isCollaborator ? createAdminClient() : supabase

  let marketingQuery = db.from('marketing_items').select('*').order('order_index')
  if (isCollaborator) marketingQuery = marketingQuery.eq('owner_area_id', ctx.areaId!)

  // Treinamentos: para colaborador, busca via adminClient com filtro por dono —
  // getTrainingItems() usa o client de sessão e a RLS esconderia os inativos dele.
  let trainingQuery = db
    .from('training_items')
    .select('*, materials:training_materials(id, training_id, title, url, type, order_index, created_at)')
    .order('order_index')
  if (isCollaborator) trainingQuery = trainingQuery.eq('owner_area_id', ctx.areaId!)

  const [{ data }, settings, { data: trainingData }, products, periods, { data: tagsData }] = await Promise.all([
    marketingQuery,
    getSettings(),
    trainingQuery,
    getMarketingProducts(),
    getMarketingPeriods(),
    supabase.from('tags').select('*').order('name'),
  ])

  const visibleTrainingItems = (trainingData ?? []) as Awaited<ReturnType<typeof getTrainingItems>>

  const allowedTabs = isCollaborator
    ? ctx.capabilities.map((c) => CAP_TO_TAB[c]).filter(Boolean)
    : null

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <MarketingTabs
        marketingItems={data ?? []}
        sections={parseSections(settings.marketing_sections)}
        trainingItems={visibleTrainingItems}
        products={products}
        periods={periods}
        tags={tagsData ?? []}
        tamojuntoWinnersRaw={settings.tamojunto_winners}
        podviajarRaw={settings.podviajar}
        corridaVendasRaw={settings.corrida_vendas}
        allowedTabs={allowedTabs}
        isAdmin={!isCollaborator}
      />
    </div>
  )
}
