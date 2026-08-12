'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, requireCapability, requireContentAccess, type AdminContext } from '@/lib/authz'
import { logActivity, diffFields } from '@/lib/activity-log'
import { revalidatePath } from 'next/cache'
import { toWebP } from '@/lib/image'
import { rdNewTraining } from '@/lib/rdstation'
import { UF_NAMES } from '@/lib/estado-flag'

// Guard de posse: colaborador só mexe em treinamento da própria área.
// Exportado — reaproveitado por resolveTrainingAccessRequest
// (src/app/actions/training-access.ts) pra aprovar/negar solicitação de
// acesso, sem duplicar a checagem de posse.
export async function requireTrainingAccess(id: string): Promise<AdminContext | { error: string }> {
  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('training_items').select('owner_area_id').eq('id', id).single()
  if (!item) return { error: 'Treinamento não encontrado.' }
  return requireContentAccess('trainings', item.owner_area_id)
}

function formatLiveAt(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export type NotifyResult = { notified: number } | { error: string; memberCount: number }

async function notifyMembers(payload: {
  id: string
  title: string
  notifType: 'new_training' | 'training_replay'
  notifTitle: string
  body: string
  exclusiveUfs?: string[]
}): Promise<NotifyResult> {
  const adminClient = createAdminClient()

  // Treinamento exclusivo de UF: só notifica quem é da UF certa — membro de
  // fora não pode acessar direto, notificar mesmo assim soaria confuso
  // ("por que não abre?"). Colaboradores (staff interno) sempre recebem,
  // independente de UF — decisão confirmada com o usuário.
  let query = adminClient
    .from('profiles')
    .select('id')
    .in('role', ['member', 'collaborator'])
    .eq('active', true)

  if (payload.exclusiveUfs && payload.exclusiveUfs.length > 0) {
    query = query.or(`role.eq.collaborator,uf.in.(${payload.exclusiveUfs.join(',')})`)
  }

  const { data: members, error: membersErr } = await query

  if (membersErr) return { error: membersErr.message, memberCount: 0 }
  if (!members?.length) return { error: 'no_members', memberCount: 0 }

  const link = `/dashboard/treinamentos/${payload.id}`
  const { error: insertErr } = await adminClient.from('notifications').insert(
    members.map((m) => ({
      user_id: m.id,
      type: payload.notifType,
      title: payload.notifTitle,
      body: payload.body,
      link,
    }))
  )

  if (insertErr) return { error: insertErr.message, memberCount: members.length }

  const memberIds = new Set(members.map((m) => m.id))
  const { data: usersData } = await adminClient.auth.admin.listUsers()
  const emails = (usersData?.users ?? [])
    .filter((u) => memberIds.has(u.id) && u.email)
    .map((u) => u.email!)
  rdNewTraining(emails, payload.notifTitle, payload.body, link)

  return { notified: members.length }
}

async function notifyNewTraining(item: { id: string; title: string; type: string; live_at: string | null; exclusive_ufs?: string[] }): Promise<NotifyResult> {
  const isLive = item.type === 'live'
  const date = isLive ? formatLiveAt(item.live_at) : null
  return notifyMembers({
    id: item.id,
    title: item.title,
    notifType: 'new_training',
    notifTitle: isLive ? 'Novo treinamento ao vivo agendado' : 'Novo treinamento disponivel',
    body: date ? `${item.title} - ${date}` : item.title,
    exclusiveUfs: item.exclusive_ufs,
  })
}

async function notifyTrainingReplay(item: { id: string; title: string; exclusive_ufs?: string[] }): Promise<NotifyResult> {
  return notifyMembers({
    id: item.id,
    title: item.title,
    notifType: 'training_replay',
    notifTitle: 'Treinamento disponivel como replay',
    body: item.title,
    exclusiveUfs: item.exclusive_ufs,
  })
}

export type TrainingMaterial = {
  id: string
  training_id: string
  title: string
  url: string
  type: string
  order_index: number
  created_at: string
}

export type TrainingItem = {
  id: string
  title: string
  description: string | null
  url: string
  cover_url: string | null
  order_index: number
  is_active: boolean
  type: 'link' | 'live' | 'replay'
  live_at: string | null
  created_at: string
  owner_area_id?: string | null
  materials?: TrainingMaterial[]
  // Array vazio = sem restrição (comportamento padrão). Uma ou mais UFs =
  // só membro dessa(s) UF ou com solicitação aprovada acessa direto.
  exclusive_ufs: string[]
}

// Serializado como JSON pelo client (fd.set('exclusive_ufs', JSON.stringify(arr))
// em trainings-manager.tsx) — valida cada sigla contra UF_NAMES, ignora
// qualquer coisa que não seja uma UF real em vez de quebrar o save inteiro.
function parseExclusiveUfs(raw: string | null): string[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .map((v) => String(v).toUpperCase().trim())
      .filter((v) => UF_NAMES[v])
  } catch {
    return []
  }
}

export async function getTrainingItem(id: string): Promise<TrainingItem | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_items')
    .select('*, materials:training_materials(id, training_id, title, url, type, order_index, created_at)')
    .eq('id', id)
    .single()

  if (error) {
    const { data: fallback } = await supabase.from('training_items').select('*').eq('id', id).single()
    return (fallback ?? null) as TrainingItem | null
  }
  return data as TrainingItem | null
}

export async function getTrainingItems(): Promise<TrainingItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('training_items')
    .select('*, materials:training_materials(id, training_id, title, url, type, order_index, created_at)')
    .order('order_index')

  if (error) {
    const { data: fallback } = await supabase
      .from('training_items')
      .select('*')
      .order('order_index')
    return (fallback ?? []) as TrainingItem[]
  }

  return (data ?? []) as TrainingItem[]
}

function parseLiveAt(raw: string | null): string | null {
  if (!raw) return null
  // datetime-local gives "YYYY-MM-DDTHH:mm" — treat as Brazil time (UTC-3)
  return new Date(raw + ':00.000-03:00').toISOString()
}

// Bug real relatado (chamado CLV-0027): treinamento "ao vivo" aceitava
// qualquer data, inclusive no passado. Só valida pro tipo 'live' — replay/
// link não usam esse campo pra "quando vai acontecer".
function isPastLiveAt(iso: string): boolean {
  return new Date(iso).getTime() < Date.now()
}

export async function createTrainingItem(formData: FormData) {
  const ctx = await requireCapability('trainings')
  if ('error' in ctx) return { error: ctx.error }

  const isActive = formData.get('is_active') === 'true'
  const type = (formData.get('type') as string) || 'link'
  const liveAt = parseLiveAt(formData.get('live_at') as string | null)
  if (type === 'live' && liveAt && isPastLiveAt(liveAt)) {
    return { error: 'A data do treinamento ao vivo não pode ser uma data que já passou.' }
  }

  const adminClient = createAdminClient()
  const title = (formData.get('title') as string).trim()
  const exclusiveUfs = parseExclusiveUfs(formData.get('exclusive_ufs') as string | null)

  const { data: inserted, error } = await adminClient.from('training_items').insert({
    title,
    description: (formData.get('description') as string)?.trim() || null,
    url: (formData.get('url') as string).trim(),
    cover_url: (formData.get('cover_url') as string)?.trim() || null,
    order_index: Number(formData.get('order_index') ?? 0),
    is_active: isActive,
    type,
    live_at: liveAt,
    owner_area_id: ctx.areaId,
    exclusive_ufs: exclusiveUfs,
  }).select('id, title, type, live_at').single()

  if (error) return { error: error.message }

  logActivity(ctx, { action: 'create', entityType: 'treinamento', entityId: inserted?.id, entityLabel: title })

  let notifyResult: NotifyResult | null = null
  if (isActive && inserted) {
    notifyResult = await notifyNewTraining({ ...inserted, exclusive_ufs: exclusiveUfs })
    revalidatePath('/dashboard', 'layout')
  }

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
  return { success: true, notify: notifyResult }
}

export async function updateTrainingItem(id: string, formData: FormData) {
  const ctx = await requireTrainingAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()

  const { data: prev } = await adminClient
    .from('training_items')
    .select('type, is_active, title, description, url, cover_url, order_index, live_at, exclusive_ufs')
    .eq('id', id)
    .single()

  const newType = (formData.get('type') as string) || 'link'
  const newActive = formData.get('is_active') === 'true'
  const newTitle = (formData.get('title') as string).trim()
  const newExclusiveUfs = parseExclusiveUfs(formData.get('exclusive_ufs') as string | null)

  const after = {
    title: newTitle,
    description: (formData.get('description') as string)?.trim() || null,
    url: (formData.get('url') as string).trim(),
    cover_url: (formData.get('cover_url') as string)?.trim() || null,
    order_index: Number(formData.get('order_index') ?? 0),
    is_active: newActive,
    type: newType,
    live_at: parseLiveAt(formData.get('live_at') as string | null),
    exclusive_ufs: newExclusiveUfs,
  }
  // Só rejeita quando a data está sendo MUDADA pra uma data passada — uma
  // live que já aconteceu naturalmente fica no passado, e isso não pode
  // impedir salvar outros campos dela (ex.: virar replay).
  if (newType === 'live' && after.live_at && after.live_at !== prev?.live_at && isPastLiveAt(after.live_at)) {
    return { error: 'A data do treinamento ao vivo não pode ser uma data que já passou.' }
  }
  const { error } = await adminClient.from('training_items').update(after).eq('id', id)

  if (error) return { error: error.message }

  const changed = diffFields(prev ?? {}, after, {
    title: 'título', description: 'descrição', url: 'link', cover_url: 'capa',
    order_index: 'ordem', is_active: 'ativação', type: 'tipo', live_at: 'data ao vivo',
    exclusive_ufs: 'UFs exclusivas',
  })
  if (changed.length > 0) {
    logActivity(ctx, { action: 'update', entityType: 'treinamento', entityId: id, entityLabel: newTitle, detail: `alterou: ${changed.join(', ')}` })
  }

  let notifyResult: NotifyResult | null = null
  const becameActive = !prev?.is_active && newActive
  const becameReplay = prev?.type !== 'replay' && newType === 'replay'
  const becameLive = prev?.type !== 'live' && newType === 'live' && newActive

  if (newActive && becameReplay) {
    const title = (formData.get('title') as string).trim() || prev?.title || ''
    notifyResult = await notifyTrainingReplay({ id, title, exclusive_ufs: newExclusiveUfs })
    revalidatePath('/dashboard', 'layout')
  } else if (becameActive || becameLive) {
    const title = (formData.get('title') as string).trim() || prev?.title || ''
    const liveAt = parseLiveAt(formData.get('live_at') as string | null)
    notifyResult = await notifyNewTraining({ id, title, type: newType, live_at: liveAt, exclusive_ufs: newExclusiveUfs })
    revalidatePath('/dashboard', 'layout')
  }

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
  return { success: true, notify: notifyResult }
}

export async function toggleTrainingActive(id: string, is_active: boolean) {
  const ctx = await requireTrainingAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('training_items').select('title').eq('id', id).single()
  const { error } = await adminClient.from('training_items').update({ is_active }).eq('id', id)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'toggle', entityType: 'treinamento', entityId: id, entityLabel: item?.title ?? id, detail: is_active ? 'ativou' : 'desativou' })

  let notifyResult: NotifyResult | null = null
  if (is_active) {
    const { data } = await adminClient
      .from('training_items')
      .select('id, title, type, live_at, exclusive_ufs')
      .eq('id', id)
      .single()
    if (data) {
      notifyResult = await notifyNewTraining(data)
      revalidatePath('/dashboard', 'layout')
    }
  }

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
  return { success: true, notify: notifyResult }
}

export async function deleteTrainingItem(id: string) {
  const ctx = await requireTrainingAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('training_items').select('title').eq('id', id).single()
  const { error } = await adminClient.from('training_items').delete().eq('id', id)
  if (error) return { error: error.message }
  logActivity(ctx, { action: 'delete', entityType: 'treinamento', entityId: id, entityLabel: item?.title ?? id })
  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
  return { success: true }
}

// Bug real relatado (chamado CLV-0027): capa de treinamento aceitava
// qualquer tipo de arquivo — mesmo fix já aplicado em uploadFamtourCover
// (v1.106.0) e uploadMarketingFile (v1.105.2), replicado aqui.
const TRAINING_COVER_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif']

export async function uploadTrainingCover(file: File) {
  const ctx = await requireCapability('trainings')
  if ('error' in ctx) return { error: ctx.error }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!TRAINING_COVER_EXTS.includes(ext)) {
    return { error: 'Apenas imagens são aceitas (JPG, PNG, WEBP ou GIF).' }
  }

  const adminClient = createAdminClient()
  let webpFile: File
  try {
    webpFile = await toWebP(file, { maxWidth: 1280, quality: 85 })
  } catch {
    return { error: 'Não foi possível processar esta imagem — ela pode estar corrompida ou num formato inesperado.' }
  }
  const isConverted = webpFile.type === 'image/webp'
  const path = `training-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${isConverted ? 'webp' : ext}`

  const { error } = await adminClient.storage.from('marketing-files').upload(path, webpFile, { contentType: webpFile.type })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = adminClient.storage.from('marketing-files').getPublicUrl(path)
  return { success: true, url: publicUrl }
}

export async function createTrainingMaterial(trainingId: string, formData: FormData) {
  const ctx = await requireTrainingAccess(trainingId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const materialTitle = (formData.get('title') as string).trim()
  const { error } = await adminClient.from('training_materials').insert({
    training_id: trainingId,
    title: materialTitle,
    url: (formData.get('url') as string).trim(),
    type: (formData.get('type') as string) || 'link',
    order_index: Number(formData.get('order_index') ?? 0),
  })

  if (error) return { error: error.message }
  logActivity(ctx, { action: 'create', entityType: 'material_treinamento', entityLabel: materialTitle, detail: `treinamento ${trainingId}` })
  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
  return { success: true }
}

export async function deleteTrainingMaterial(id: string) {
  const adminClient = createAdminClient()
  const { data: material } = await adminClient.from('training_materials').select('training_id, title').eq('id', id).single()
  if (!material) return { error: 'Material não encontrado.' }

  const ctx = await requireTrainingAccess(material.training_id)
  if ('error' in ctx) return { error: ctx.error }

  const { error } = await adminClient.from('training_materials').delete().eq('id', id)
  if (error) return { error: error.message }
  logActivity(ctx, { action: 'delete', entityType: 'material_treinamento', entityId: id, entityLabel: material.title })
  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
  return { success: true }
}

export async function checkAndNotifyExpiredLive(items: TrainingItem[]) {
  const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000)
  const expired = items.filter(
    (i) => i.type === 'live' && i.is_active && i.live_at && new Date(i.live_at) < twoHoursAgo
  )
  if (!expired.length) return

  const adminClient = createAdminClient()
  const { data: admins } = await adminClient.from('profiles').select('id').eq('role', 'admin')
  if (!admins?.length) return

  for (const item of expired) {
    const link = `/admin/marketing?training=${item.id}`
    const { data: existing } = await adminClient
      .from('notifications')
      .select('id')
      .eq('type', 'training_live_expired')
      .eq('link', link)
      .limit(1)
    if (existing?.length) continue

    await adminClient.from('notifications').insert(
      admins.map((a) => ({
        user_id: a.id,
        type: 'training_live_expired',
        title: 'Sessão ao vivo encerrada',
        body: `"${item.title}" terminou há mais de 2 horas. Atualize o link para replay.`,
        link,
      }))
    )
  }
}

// Reorder é admin-only: a listagem do colaborador é parcial (só a área dele)
// e reordenar um subconjunto bagunçaria os índices globais.
export async function reorderTrainingItems(ids: string[]) {
  const auth = await requireAdmin()
  if ('error' in auth) return

  const adminClient = createAdminClient()
  await Promise.all(
    ids.map((id, index) =>
      adminClient.from('training_items').update({ order_index: index }).eq('id', id)
    )
  )
  logActivity(auth, { action: 'reorder', entityType: 'treinamento', entityLabel: 'Treinamentos', detail: `reordenou ${ids.length} itens` })
  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
}
