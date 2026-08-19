import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSettings } from '@/lib/settings'
import { requireContentPage, getPreviewAreaContext } from '@/lib/authz'
import { MarketingTabs } from '@/components/admin/marketing-tabs'
import type { MarketingSection } from '@/components/admin/marketing-manager'
import { getTrainingItems } from '@/app/actions/training'
import { getMarketingProducts, getMarketingPeriods } from '@/app/actions/marketing'
import { toOne } from '@/lib/supabase/relations'
import type { PendingAccessRequest } from '@/lib/access-lock'

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
    { data: famtoursData }, { data: eventosData }, { data: gruposData }, { data: commercialConditionsData },
    { data: accessRequestsData }, { data: famtourAccessRequestsData },
  ] = await Promise.all([
    db.from('marketing_items').select('*').order('order_index'),
    getSettings(),
    db.from('training_items').select('*, materials:training_materials(id, training_id, title, url, type, order_index, created_at)').order('order_index'),
    getMarketingProducts(),
    getMarketingPeriods(),
    supabase.from('tags').select('*').order('name'),
    db.from('famtours').select('*, photos:famtour_photos(*), testimonials:famtour_testimonials(*)').order('start_date', { ascending: true, nullsFirst: false }),
    db.from('eventos').select('*, photos:evento_photos(*), testimonials:evento_testimonials(*)').order('start_date', { ascending: true, nullsFirst: false }),
    db.from('grupos').select('*').order('start_date', { ascending: true, nullsFirst: false }),
    db.from('commercial_conditions').select('*').order('created_at', { ascending: false }),
    // training_access_requests tem DUAS FKs pra profiles (member_id e
    // resolved_by) — sem qualificar qual delas, o PostgREST recusa o embed
    // com erro de ambiguidade (PGRST201), retornando null em silêncio pro
    // client (nenhuma exception visível, só accessRequestsData chegando
    // vazio). Precisa do nome da constraint explícito.
    db.from('training_access_requests')
      .select('id, training_id, member_id, requested_at, profiles!training_access_requests_member_id_fkey(full_name, company, uf)')
      .eq('status', 'pending')
      .order('requested_at'),
    // Mesma armadilha do PGRST201 — famtour_access_requests também tem duas
    // FKs pra profiles (member_id e resolved_by), qualificar desde o início.
    db.from('famtour_access_requests')
      .select('id, famtour_id, member_id, requested_at, profiles!famtour_access_requests_member_id_fkey(full_name, company, uf)')
      .eq('status', 'pending')
      .order('requested_at'),
  ])

  // Agrupa por treinamento — vira o contador "solicitações pendentes" na
  // lista do admin. toOne() porque profiles() é N→1 (embed do PostgREST
  // volta objeto em runtime, o client sem tipos gerados infere array).
  const pendingAccessByTraining = new Map<string, PendingAccessRequest[]>()
  for (const r of accessRequestsData ?? []) {
    const profile = toOne(r.profiles as unknown as { full_name: string; company: string; uf: string }[] | { full_name: string; company: string; uf: string })
    const list = pendingAccessByTraining.get(r.training_id) ?? []
    list.push({
      id: r.id,
      memberName: profile?.full_name || 'Agência sem nome',
      company: profile?.company || '',
      uf: profile?.uf || '',
      requestedAt: r.requested_at,
    })
    pendingAccessByTraining.set(r.training_id, list)
  }

  const pendingAccessByFamtour = new Map<string, PendingAccessRequest[]>()
  for (const r of famtourAccessRequestsData ?? []) {
    const profile = toOne(r.profiles as unknown as { full_name: string; company: string; uf: string }[] | { full_name: string; company: string; uf: string })
    const list = pendingAccessByFamtour.get(r.famtour_id) ?? []
    list.push({
      id: r.id,
      memberName: profile?.full_name || 'Agência sem nome',
      company: profile?.company || '',
      uf: profile?.uf || '',
      requestedAt: r.requested_at,
    })
    pendingAccessByFamtour.set(r.famtour_id, list)
  }

  const visibleTrainingItems = (trainingData ?? []) as Awaited<ReturnType<typeof getTrainingItems>>

  const canEditTraining = isAdmin || viewCtx.capabilities.includes('trainings')
  const canEditFamtour = isAdmin || viewCtx.capabilities.includes('famtours')
  const canEditEvento = isAdmin || viewCtx.capabilities.includes('eventos')
  const canEditGrupo = isAdmin || viewCtx.capabilities.includes('grupos')
  const canEditComercial = isAdmin || viewCtx.capabilities.includes('comercial')
  // Premiação/PodViajar/Corrida de Vendas são settings globais (sem owner_area_id,
  // não fazem sentido "por posse") — liberados pra quem tem a capacidade marketing.
  const canEditMarketingSettings = isAdmin || viewCtx.capabilities.includes('marketing')

  const trainingItemsWithEdit = visibleTrainingItems.map((t) => ({
    ...t,
    canEdit: isAdmin || (canEditTraining && t.owner_area_id === viewCtx.areaId),
    pendingAccessRequests: pendingAccessByTraining.get(t.id) ?? [],
  }))
  // Foto de galeria só grava o storage_path — a URL pública é construída na
  // hora (sem chamada de rede, `getPublicUrl` só monta a string), igual ao
  // padrão já usado pra fotos de aula (`PhotoWithUrl` em lesson-editor.tsx).
  function withGalleryUrls<P extends { storage_path: string; order_index: number }>(photos: P[] | null): (P & { url: string })[] {
    return (photos ?? [])
      .map((p) => ({ ...p, url: db.storage.from('marketing-files').getPublicUrl(p.storage_path).data.publicUrl }))
      .sort((a, b) => a.order_index - b.order_index)
  }
  function sortByOrder<T extends { order_index: number }>(items: T[] | null): T[] {
    return (items ?? []).slice().sort((a, b) => a.order_index - b.order_index)
  }

  const famtoursWithEdit = (famtoursData ?? []).map((f) => ({
    ...f,
    canEdit: isAdmin || (canEditFamtour && f.owner_area_id === viewCtx.areaId),
    pendingAccessRequests: pendingAccessByFamtour.get(f.id) ?? [],
    photos: withGalleryUrls(f.photos),
    testimonials: sortByOrder(f.testimonials),
  }))
  const eventosWithEdit = (eventosData ?? []).map((e) => ({
    ...e,
    canEdit: isAdmin || (canEditEvento && e.owner_area_id === viewCtx.areaId),
    photos: withGalleryUrls(e.photos),
    testimonials: sortByOrder(e.testimonials),
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
        eventos={eventosWithEdit}
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
        canCreateEvento={canEditEvento}
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
