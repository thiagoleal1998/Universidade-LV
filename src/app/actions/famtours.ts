'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireCapability, requireContentAccess, type AdminContext } from '@/lib/authz'
import { logActivity, diffFields } from '@/lib/activity-log'
import { revalidatePath } from 'next/cache'
import { toWebP } from '@/lib/image'
import { parseExclusiveUfs } from '@/lib/access-lock'

export type Famtour = {
  id: string
  title: string
  description: string
  cover_url: string
  url: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
  owner_area_id: string | null
  created_at: string
  // Array vazio = sem restrição (comportamento padrão). Uma ou mais UFs =
  // só membro dessa(s) UF ou com solicitação aprovada acessa direto.
  exclusive_ufs: string[]
}

// Guard de posse: colaborador só mexe em famtour da própria área.
// Exportado — reaproveitado por resolveFamtourAccessRequest
// (src/app/actions/famtour-access.ts) pra aprovar/negar solicitação de
// acesso, sem duplicar a checagem de posse.
export async function requireFamtourAccess(id: string): Promise<AdminContext | { error: string }> {
  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('famtours').select('owner_area_id').eq('id', id).single()
  if (!item) return { error: 'Famtour não encontrado.' }
  return requireContentAccess('famtours', item.owner_area_id)
}

// Compara strings 'YYYY-MM-DD' — formato de DATE do Postgres/input date,
// ordena corretamente como string sem precisar converter pra Date/fuso.
function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function createFamtour(formData: FormData) {
  const ctx = await requireCapability('famtours')
  if ('error' in ctx) return { error: ctx.error }

  const title = ((formData.get('title') as string) ?? '').trim()
  if (!title) return { error: 'Informe o nome/destino do famtour.' }

  const startDate = (formData.get('start_date') as string) || null
  const endDate = (formData.get('end_date') as string) || null
  const today = todayIsoDate()
  // Famtour novo nunca deveria nascer com data no passado — o `min` do
  // input já bloqueia isso na UI, mas quem chama a action direto (ou
  // desabilita JS) precisa da mesma regra aplicada no servidor.
  if (startDate && startDate < today) return { error: 'A data de início não pode ser uma data que já passou.' }
  if (endDate && endDate < today) return { error: 'A data de fim não pode ser uma data que já passou.' }

  const adminClient = createAdminClient()
  const exclusiveUfs = parseExclusiveUfs(formData.get('exclusive_ufs') as string | null)
  const { data: inserted, error } = await adminClient.from('famtours').insert({
    title,
    description: ((formData.get('description') as string) ?? '').trim(),
    cover_url: ((formData.get('cover_url') as string) ?? '').trim(),
    url: ((formData.get('url') as string) ?? '').trim(),
    start_date: startDate,
    end_date: endDate,
    is_active: formData.get('is_active') === 'true',
    owner_area_id: ctx.areaId,
    exclusive_ufs: exclusiveUfs,
  }).select('id').single()
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'create', entityType: 'famtour', entityId: inserted?.id, entityLabel: title })

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateFamtour(id: string, formData: FormData) {
  const ctx = await requireFamtourAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const title = ((formData.get('title') as string) ?? '').trim()
  if (!title) return { error: 'Informe o nome/destino do famtour.' }

  const adminClient = createAdminClient()
  const { data: prev } = await adminClient
    .from('famtours')
    .select('title, description, cover_url, url, start_date, end_date, is_active, exclusive_ufs')
    .eq('id', id)
    .single()

  const startDate = (formData.get('start_date') as string) || null
  const endDate = (formData.get('end_date') as string) || null
  const today = todayIsoDate()
  // Só bloqueia data passada quando ela está sendo MUDADA pra uma data
  // passada — um famtour que já aconteceu (start_date antigo, sem tocar
  // nele) continua editável em outros campos sem exigir apagar a viagem.
  if (startDate && startDate < today && startDate !== prev?.start_date) {
    return { error: 'A data de início não pode ser uma data que já passou.' }
  }
  if (endDate && endDate < today && endDate !== prev?.end_date) {
    return { error: 'A data de fim não pode ser uma data que já passou.' }
  }

  const after = {
    title,
    description: ((formData.get('description') as string) ?? '').trim(),
    cover_url: ((formData.get('cover_url') as string) ?? '').trim(),
    url: ((formData.get('url') as string) ?? '').trim(),
    start_date: startDate,
    end_date: endDate,
    is_active: formData.get('is_active') === 'true',
    exclusive_ufs: parseExclusiveUfs(formData.get('exclusive_ufs') as string | null),
  }
  const { error } = await adminClient.from('famtours').update(after).eq('id', id)
  if (error) return { error: error.message }

  const changed = diffFields(prev ?? {}, after, {
    title: 'título', description: 'descrição', cover_url: 'capa', url: 'link',
    start_date: 'data de início', end_date: 'data de fim', is_active: 'ativação',
    exclusive_ufs: 'UFs exclusivas',
  })
  if (changed.length > 0) {
    logActivity(ctx, { action: 'update', entityType: 'famtour', entityId: id, entityLabel: title, detail: `alterou: ${changed.join(', ')}` })
  }

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleFamtourActive(id: string, active: boolean) {
  const ctx = await requireFamtourAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('famtours').select('title').eq('id', id).single()
  const { error } = await adminClient.from('famtours').update({ is_active: active }).eq('id', id)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'toggle', entityType: 'famtour', entityId: id, entityLabel: item?.title ?? id, detail: active ? 'ativou' : 'desativou' })

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteFamtour(id: string) {
  const ctx = await requireFamtourAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('famtours').select('title').eq('id', id).single()
  const { error } = await adminClient.from('famtours').delete().eq('id', id)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'delete', entityType: 'famtour', entityId: id, entityLabel: item?.title ?? id })

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard')
  return { success: true }
}

// Extensão é a fonte de verdade, não `file.type` — o navegador deriva o
// `type` de um File justamente pela extensão, então um arquivo renomeado
// pra ".jpg" passaria pela checagem de qualquer forma; é o try/catch em
// volta do toWebP() (sharp) que pega esse caso na prática, na hora de
// decodificar bytes que não são realmente uma imagem.
const FAMTOUR_COVER_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif']

export async function uploadFamtourCover(file: File) {
  const ctx = await requireCapability('famtours')
  if ('error' in ctx) return { error: ctx.error }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!FAMTOUR_COVER_EXTS.includes(ext)) {
    return { error: 'Apenas imagens são aceitas (JPG, PNG, WEBP ou GIF).' }
  }

  const adminClient = createAdminClient()
  let webpFile: File
  try {
    webpFile = await toWebP(file, { maxWidth: 1280, quality: 85 })
  } catch {
    return { error: 'Não foi possível processar esta imagem — ela pode estar corrompida ou num formato inesperado.' }
  }
  // `contentType` vem do arquivo de saída de verdade — antes era sempre
  // 'image/webp' mesmo quando toWebP() devolvia o arquivo intacto (só
  // acontece pra `image/svg+xml`, que não é convertido), gravando um
  // Content-Type errado no storage.
  const isConverted = webpFile.type === 'image/webp'
  const path = `famtour-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${isConverted ? 'webp' : ext}`

  const { error } = await adminClient.storage.from('marketing-files').upload(path, webpFile, { contentType: webpFile.type })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = adminClient.storage.from('marketing-files').getPublicUrl(path)
  return { success: true, url: publicUrl }
}
