'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireCapability, requireContentAccess, type AdminContext } from '@/lib/authz'
import { logActivity, diffFields } from '@/lib/activity-log'
import { revalidatePath } from 'next/cache'
import { toWebP } from '@/lib/image'
import { parseExclusiveUfs } from '@/lib/access-lock'
import { generateUniqueSlug } from '@/lib/slug'

export type Famtour = {
  id: string
  title: string
  description: string
  cover_url: string
  url: string
  video_url: string | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  owner_area_id: string | null
  created_at: string
  slug: string | null
  // Array vazio = sem restrição (comportamento padrão). Uma ou mais UFs =
  // só membro dessa(s) UF ou com solicitação aprovada acessa direto.
  exclusive_ufs: string[]
}

export type FamtourPhoto = { id: string; famtour_id: string; storage_path: string; caption: string; order_index: number; created_at: string }
export type FamtourTestimonial = { id: string; famtour_id: string; author_name: string; author_role: string; photo_url: string; content: string; order_index: number; created_at: string }

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

export async function createFamtour(formData: FormData) {
  const ctx = await requireCapability('famtours')
  if ('error' in ctx) return { error: ctx.error }

  const title = ((formData.get('title') as string) ?? '').trim()
  if (!title) return { error: 'Informe o nome/destino do famtour.' }

  // Data passada é permitida de propósito — o admin também cadastra
  // famtours que já aconteceram (não só viagens futuras/em andamento),
  // pra divulgar depoimentos/galeria de uma viagem já realizada.
  const startDate = (formData.get('start_date') as string) || null
  const endDate = (formData.get('end_date') as string) || null

  const adminClient = createAdminClient()
  const exclusiveUfs = parseExclusiveUfs(formData.get('exclusive_ufs') as string | null)

  // URL bonita (/dashboard/famtours/<slug>) — sem pai pra compor (igual
  // curso), gerado uma vez na criação, nunca regenerado em edição.
  const { data: existingSlugs } = await adminClient.from('famtours').select('slug')
  const slugSet = new Set((existingSlugs ?? []).map((r) => r.slug).filter((s): s is string => !!s))
  const slug = generateUniqueSlug(title, slugSet)

  const { data: inserted, error } = await adminClient.from('famtours').insert({
    title,
    description: ((formData.get('description') as string) ?? '').trim(),
    cover_url: ((formData.get('cover_url') as string) ?? '').trim(),
    url: ((formData.get('url') as string) ?? '').trim(),
    video_url: ((formData.get('video_url') as string) ?? '').trim() || null,
    start_date: startDate,
    end_date: endDate,
    is_active: formData.get('is_active') === 'true',
    owner_area_id: ctx.areaId,
    exclusive_ufs: exclusiveUfs,
    slug,
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
    .select('title, description, cover_url, url, video_url, start_date, end_date, is_active, exclusive_ufs, slug')
    .eq('id', id)
    .single()

  // Data passada é permitida de propósito — ver mesma nota em createFamtour.
  const startDate = (formData.get('start_date') as string) || null
  const endDate = (formData.get('end_date') as string) || null

  const after = {
    title,
    description: ((formData.get('description') as string) ?? '').trim(),
    cover_url: ((formData.get('cover_url') as string) ?? '').trim(),
    url: ((formData.get('url') as string) ?? '').trim(),
    video_url: ((formData.get('video_url') as string) ?? '').trim() || null,
    start_date: startDate,
    end_date: endDate,
    is_active: formData.get('is_active') === 'true',
    exclusive_ufs: parseExclusiveUfs(formData.get('exclusive_ufs') as string | null),
  }
  const { error } = await adminClient.from('famtours').update(after).eq('id', id)
  if (error) return { error: error.message }

  const changed = diffFields(prev ?? {}, after, {
    title: 'título', description: 'descrição', cover_url: 'capa', url: 'link', video_url: 'vídeo',
    start_date: 'data de início', end_date: 'data de fim', is_active: 'ativação',
    exclusive_ufs: 'UFs exclusivas',
  })
  if (changed.length > 0) {
    logActivity(ctx, { action: 'update', entityType: 'famtour', entityId: id, entityLabel: title, detail: `alterou: ${changed.join(', ')}` })
  }

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard', 'layout')
  revalidatePath(`/dashboard/famtours/${prev?.slug ?? id}`)
  return { success: true }
}

export async function toggleFamtourActive(id: string, active: boolean) {
  const ctx = await requireFamtourAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('famtours').select('title, slug').eq('id', id).single()
  const { error } = await adminClient.from('famtours').update({ is_active: active }).eq('id', id)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'toggle', entityType: 'famtour', entityId: id, entityLabel: item?.title ?? id, detail: active ? 'ativou' : 'desativou' })

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard', 'layout')
  revalidatePath(`/dashboard/famtours/${item?.slug ?? id}`)
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
  revalidatePath('/dashboard', 'layout')
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

// ── Galeria de fotos ─────────────────────────────────────────────────────

export async function uploadFamtourGalleryPhoto(famtourId: string, file: File, caption: string) {
  const ctx = await requireFamtourAccess(famtourId)
  if ('error' in ctx) return { error: ctx.error }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!FAMTOUR_COVER_EXTS.includes(ext)) {
    return { error: 'Apenas imagens são aceitas (JPG, PNG, WEBP ou GIF).' }
  }

  const adminClient = createAdminClient()
  let webpFile: File
  try {
    webpFile = await toWebP(file, { maxWidth: 1200, quality: 85 })
  } catch {
    return { error: 'Não foi possível processar esta imagem — ela pode estar corrompida ou num formato inesperado.' }
  }
  const path = `famtour-gallery/${famtourId}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`

  const { error: uploadError } = await adminClient.storage.from('marketing-files').upload(path, webpFile, { contentType: webpFile.type })
  if (uploadError) return { error: uploadError.message }

  const { data: photos } = await adminClient
    .from('famtour_photos')
    .select('order_index')
    .eq('famtour_id', famtourId)
    .order('order_index', { ascending: false })
    .limit(1)
  const nextIndex = (photos?.[0]?.order_index ?? -1) + 1

  const { data: inserted, error: dbError } = await adminClient
    .from('famtour_photos')
    .insert({ famtour_id: famtourId, storage_path: path, caption, order_index: nextIndex })
    .select()
    .single()
  if (dbError) return { error: dbError.message }

  logActivity(ctx, { action: 'upload', entityType: 'famtour', entityId: famtourId, entityLabel: famtourId, detail: `foto da galeria: ${caption || file.name}` })

  revalidatePath('/admin/marketing')
  const { data: item } = await adminClient.from('famtours').select('slug').eq('id', famtourId).single()
  revalidatePath(`/dashboard/famtours/${item?.slug ?? famtourId}`)

  const { data: { publicUrl } } = adminClient.storage.from('marketing-files').getPublicUrl(path)
  return { success: true, data: { ...inserted, url: publicUrl } }
}

export async function deleteFamtourGalleryPhoto(photoId: string, storagePath: string, famtourId: string) {
  const ctx = await requireFamtourAccess(famtourId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  await adminClient.storage.from('marketing-files').remove([storagePath])

  const [{ error }, { data: item }] = await Promise.all([
    adminClient.from('famtour_photos').delete().eq('id', photoId),
    adminClient.from('famtours').select('slug').eq('id', famtourId).single(),
  ])
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'delete', entityType: 'famtour', entityId: famtourId, entityLabel: famtourId, detail: 'excluiu foto da galeria' })

  revalidatePath('/admin/marketing')
  revalidatePath(`/dashboard/famtours/${item?.slug ?? famtourId}`)
  return { success: true }
}

// ── Depoimentos ──────────────────────────────────────────────────────────

export async function createFamtourTestimonial(famtourId: string, formData: FormData) {
  const ctx = await requireFamtourAccess(famtourId)
  if ('error' in ctx) return { error: ctx.error }

  const authorName = ((formData.get('author_name') as string) ?? '').trim()
  if (!authorName) return { error: 'Informe o nome de quem deu o depoimento.' }

  const adminClient = createAdminClient()
  const { data: existing } = await adminClient
    .from('famtour_testimonials')
    .select('order_index')
    .eq('famtour_id', famtourId)
    .order('order_index', { ascending: false })
    .limit(1)
  const nextIndex = (existing?.[0]?.order_index ?? -1) + 1

  const { data: inserted, error } = await adminClient.from('famtour_testimonials').insert({
    famtour_id: famtourId,
    author_name: authorName,
    author_role: ((formData.get('author_role') as string) ?? '').trim(),
    photo_url: ((formData.get('photo_url') as string) ?? '').trim(),
    content: ((formData.get('content') as string) ?? '').trim(),
    order_index: nextIndex,
  }).select().single()
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'create', entityType: 'famtour', entityId: famtourId, entityLabel: famtourId, detail: `depoimento: ${authorName}` })

  revalidatePath('/admin/marketing')
  const { data: item } = await adminClient.from('famtours').select('slug').eq('id', famtourId).single()
  revalidatePath(`/dashboard/famtours/${item?.slug ?? famtourId}`)
  return { success: true, data: inserted }
}

export async function updateFamtourTestimonial(id: string, famtourId: string, formData: FormData) {
  const ctx = await requireFamtourAccess(famtourId)
  if ('error' in ctx) return { error: ctx.error }

  const authorName = ((formData.get('author_name') as string) ?? '').trim()
  if (!authorName) return { error: 'Informe o nome de quem deu o depoimento.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('famtour_testimonials').update({
    author_name: authorName,
    author_role: ((formData.get('author_role') as string) ?? '').trim(),
    photo_url: ((formData.get('photo_url') as string) ?? '').trim(),
    content: ((formData.get('content') as string) ?? '').trim(),
  }).eq('id', id).eq('famtour_id', famtourId)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'update', entityType: 'famtour', entityId: famtourId, entityLabel: famtourId, detail: `alterou depoimento: ${authorName}` })

  revalidatePath('/admin/marketing')
  const { data: item } = await adminClient.from('famtours').select('slug').eq('id', famtourId).single()
  revalidatePath(`/dashboard/famtours/${item?.slug ?? famtourId}`)
  return { success: true }
}

export async function deleteFamtourTestimonial(id: string, famtourId: string) {
  const ctx = await requireFamtourAccess(famtourId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  // Confirma que o depoimento é mesmo deste famtour antes de excluir — sem
  // isso, um `id` de outro famtour (posse já validada pelo guard acima só
  // pro famtourId) poderia ser apagado por engano.
  const { error } = await adminClient.from('famtour_testimonials').delete().eq('id', id).eq('famtour_id', famtourId)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'delete', entityType: 'famtour', entityId: famtourId, entityLabel: famtourId, detail: 'excluiu depoimento' })

  revalidatePath('/admin/marketing')
  const { data: item } = await adminClient.from('famtours').select('slug').eq('id', famtourId).single()
  revalidatePath(`/dashboard/famtours/${item?.slug ?? famtourId}`)
  return { success: true }
}

// Upload de foto de depoimento — só devolve a URL, não grava em tabela
// nenhuma (quem chama junta com o resto do form e salva via create/update
// testimonial acima). Mesmo tratamento de extensão/try-catch de uploadFamtourCover.
export async function uploadFamtourTestimonialPhoto(file: File) {
  const ctx = await requireCapability('famtours')
  if ('error' in ctx) return { error: ctx.error }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!FAMTOUR_COVER_EXTS.includes(ext)) {
    return { error: 'Apenas imagens são aceitas (JPG, PNG, WEBP ou GIF).' }
  }

  const adminClient = createAdminClient()
  let webpFile: File
  try {
    webpFile = await toWebP(file, { maxWidth: 400, quality: 85 })
  } catch {
    return { error: 'Não foi possível processar esta imagem — ela pode estar corrompida ou num formato inesperado.' }
  }
  const isConverted = webpFile.type === 'image/webp'
  const path = `famtour-testimonials/${Date.now()}-${Math.random().toString(36).slice(2)}.${isConverted ? 'webp' : ext}`

  const { error } = await adminClient.storage.from('marketing-files').upload(path, webpFile, { contentType: webpFile.type })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = adminClient.storage.from('marketing-files').getPublicUrl(path)
  return { success: true, url: publicUrl }
}
