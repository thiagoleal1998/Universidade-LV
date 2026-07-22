import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSettings } from '@/lib/settings'
import { requireContentPage, getPreviewAreaContext } from '@/lib/authz'
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

export default async function MarketingPage() {
  const ctx = await requireContentPage()
  const viewCtx = await getPreviewAreaContext(ctx)
  const isAdmin = viewCtx.role === 'admin'

  const supabase = await createClient()
  // Todo mundo vê tudo, de qualquer área — editar exige capacidade + posse,
  // checado por item (canEdit) e de verdade nas actions de mutação.
  const db = createAdminClient()

  const [
    { data }, settings, { data: trainingData }, products, periods, { data: tagsData },
    { data: famtoursData }, { data: gruposData }, { data: commercialConditionsData },
  ] = await Promise.all([
    db.from('marketing_items').select('*').order('order_index'),
    getSettings(),
    db.from('training_items').select('*, materials:training_materials(id, training_id, title, url, type, order_index, created_at)').order('order_index'),
    getMarketingProducts(),
    getMarketingPeriods(),
    supabase.from('tags').select('*').order('name'),
    db.from('famtours').select('*').order('start_date', { ascending: true, nullsFirst: false }),
    db.from('grupos').select('*').order('start_date', { ascending: true, nullsFirst: false }),
    db.from('commercial_conditions').select('*').order('created_at', { ascending: false }),
  ])

  const visibleTrainingItems = (trainingData ?? []) as Awaited<ReturnType<typeof getTrainingItems>>

  const canEditTraining = isAdmin || viewCtx.capabilities.includes('trainings')
  const canEditFamtour = isAdmin || viewCtx.capabilities.includes('famtours')
  const canEditGrupo = isAdmin || viewCtx.capabilities.includes('grupos')
  const canEditComercial = isAdmin || viewCtx.capabilities.includes('comercial')
  // Premiação/PodViajar/Corrida de Vendas são settings globais (sem owner_area_id,
  // não fazem sentido "por posse") — liberados pra quem tem a capacidade marketing.
  const canEditMarketingSettings = isAdmin || viewCtx.capabilities.includes('marketing')

  const trainingItemsWithEdit = visibleTrainingItems.map((t) => ({
    ...t,
    canEdit: isAdmin || (canEditTraining && t.owner_area_id === viewCtx.areaId),
  }))
  const famtoursWithEdit = (famtoursData ?? []).map((f) => ({
    ...f,
    canEdit: isAdmin || (canEditFamtour && f.owner_area_id === viewCtx.areaId),
  }))
  const gruposWithEdit = (gruposData ?? []).map((g) => ({
    ...g,
    canEdit: isAdmin || (canEditGrupo && g.owner_area_id === viewCtx.areaId),
  }))
  const commercialConditionsWithEdit = (commercialConditionsData ?? []).map((c) => ({
    ...c,
    canEdit: isAdmin || (canEditComercial && c.owner_area_id === viewCtx.areaId),
  }))

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <MarketingTabs
        marketingItems={data ?? []}
        sections={parseSections(settings.marketing_sections)}
        trainingItems={trainingItemsWithEdit}
        famtours={famtoursWithEdit}
        grupos={gruposWithEdit}
        commercialConditions={commercialConditionsWithEdit}
        products={products}
        periods={periods}
        tags={tagsData ?? []}
        tamojuntoWinnersRaw={settings.tamojunto_winners}
        podviajarRaw={settings.podviajar}
        corridaVendasRaw={settings.corrida_vendas}
        canCreateTraining={canEditTraining}
        canCreateFamtour={canEditFamtour}
        canCreateGrupo={canEditGrupo}
        canCreateComercial={canEditComercial}
        userRole={viewCtx.role}
        userAreaId={viewCtx.areaId}
        userCapabilities={viewCtx.capabilities}
        canEditMarketingSettings={canEditMarketingSettings}
      />
    </div>
  )
}
