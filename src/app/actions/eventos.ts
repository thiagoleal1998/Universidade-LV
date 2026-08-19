'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireCapability, requireContentAccess, type AdminContext } from '@/lib/authz'
import { logActivity, diffFields } from '@/lib/activity-log'
import { revalidatePath } from 'next/cache'
import { toWebP } from '@/lib/image'
import { generateUniqueSlug } from '@/lib/slug'

export type Evento = {
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
}

export type EventoPhoto = { id: string; evento_id: string; storage_path: string; caption: string; order_index: number; created_at: string }
export type EventoTestimonial = { id: string; evento_id: string; author_name: string; author_role: string; photo_url: string; content: string; order_index: number; created_at: string }

// Guard de posse: colaborador só mexe em evento da própria área.
export async function requireEventoAccess(id: string): Promise<AdminContext | { error: string }> {
  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('eventos').select('owner_area_id').eq('id', id).single()
  if (!item) return { error: 'Evento não encontrado.' }
  return requireContentAccess('eventos', item.owner_area_id)
}

// Compara strings 'YYYY-MM-DD' — formato de DATE do Postgres/input date,
// ordena corretamente como string sem precisar converter pra Date/fuso.
function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function createEvento(formData: FormData) {
  const ctx = await requireCapability('eventos')
  if ('error' in ctx) return { error: ctx.error }

  const title = ((formData.get('title') as string) ?? '').trim()
  if (!title) return { error: 'Informe o nome do evento.' }

  const startDate = (formData.get('start_date') as string) || null
  const endDate = (formData.get('end_date') as string) || null
  const today = todayIsoDate()
  if (startDate && startDate < today) return { error: 'A data de início não pode ser uma data que já passou.' }
  if (endDate && endDate < today) return { error: 'A data de fim não pode ser uma data que já passou.' }

  const adminClient = createAdminClient()

  // URL bonita (/dashboard/eventos/<slug>) — sem pai pra compor (igual
  // curso/famtour), gerado uma vez na criação, nunca regenerado em edição.
  const { data: existingSlugs } = await adminClient.from('eventos').select('slug')
  const slugSet = new Set((existingSlugs ?? []).map((r) => r.slug).filter((s): s is string => !!s))
  const slug = generateUniqueSlug(title, slugSet)

  const { data: inserted, error } = await adminClient.from('eventos').insert({
    title,
    description: ((formData.get('description') as string) ?? '').trim(),
    cover_url: ((formData.get('cover_url') as string) ?? '').trim(),
    url: ((formData.get('url') as string) ?? '').trim(),
    video_url: ((formData.get('video_url') as string) ?? '').trim() || null,
    start_date: startDate,
    end_date: endDate,
    is_active: formData.get('is_active') === 'true',
    owner_area_id: ctx.areaId,
    slug,
  }).select('id').single()
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'create', entityType: 'evento', entityId: inserted?.id, entityLabel: title })

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function updateEvento(id: string, formData: FormData) {
  const ctx = await requireEventoAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const title = ((formData.get('title') as string) ?? '').trim()
  if (!title) return { error: 'Informe o nome do evento.' }

  const adminClient = createAdminClient()
  const { data: prev } = await adminClient
    .from('eventos')
    .select('title, description, cover_url, url, video_url, start_date, end_date, is_active, slug')
    .eq('id', id)
    .single()

  const startDate = (formData.get('start_date') as string) || null
  const endDate = (formData.get('end_date') as string) || null
  const today = todayIsoDate()
  // Só bloqueia data passada quando ela está sendo MUDADA pra uma data
  // passada — um evento que já aconteceu continua editável em outros campos.
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
    video_url: ((formData.get('video_url') as string) ?? '').trim() || null,
    start_date: startDate,
    end_date: endDate,
    is_active: formData.get('is_active') === 'true',
  }
  const { error } = await adminClient.from('eventos').update(after).eq('id', id)
  if (error) return { error: error.message }

  const changed = diffFields(prev ?? {}, after, {
    title: 'título', description: 'descrição', cover_url: 'capa', url: 'link', video_url: 'vídeo',
    start_date: 'data de início', end_date: 'data de fim', is_active: 'ativação',
  })
  if (changed.length > 0) {
    logActivity(ctx, { action: 'update', entityType: 'evento', entityId: id, entityLabel: title, detail: `alterou: ${changed.join(', ')}` })
  }

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard', 'layout')
  revalidatePath(`/dashboard/eventos/${prev?.slug ?? id}`)
  return { success: true }
}

export async function toggleEventoActive(id: string, active: boolean) {
  const ctx = await requireEventoAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('eventos').select('title, slug').eq('id', id).single()
  const { error } = await adminClient.from('eventos').update({ is_active: active }).eq('id', id)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'toggle', entityType: 'evento', entityId: id, entityLabel: item?.title ?? id, detail: active ? 'ativou' : 'desativou' })

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard', 'layout')
  revalidatePath(`/dashboard/eventos/${item?.slug ?? id}`)
  return { success: true }
}

export async function deleteEvento(id: string) {
  const ctx = await requireEventoAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('eventos').select('title').eq('id', id).single()
  const { error } = await adminClient.from('eventos').delete().eq('id', id)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'delete', entityType: 'evento', entityId: id, entityLabel: item?.title ?? id })

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

// Extensão é a fonte de verdade, não `file.type` — mesmo motivo documentado
// em uploadFamtourCover.
const EVENTO_COVER_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif']

export async function uploadEventoCover(file: File) {
  const ctx = await requireCapability('eventos')
  if ('error' in ctx) return { error: ctx.error }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!EVENTO_COVER_EXTS.includes(ext)) {
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
  const path = `evento-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${isConverted ? 'webp' : ext}`

  const { error } = await adminClient.storage.from('marketing-files').upload(path, webpFile, { contentType: webpFile.type })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = adminClient.storage.from('marketing-files').getPublicUrl(path)
  return { success: true, url: publicUrl }
}

// ── Galeria de fotos ─────────────────────────────────────────────────────

export async function uploadEventoGalleryPhoto(eventoId: string, file: File, caption: string) {
  const ctx = await requireEventoAccess(eventoId)
  if ('error' in ctx) return { error: ctx.error }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!EVENTO_COVER_EXTS.includes(ext)) {
    return { error: 'Apenas imagens são aceitas (JPG, PNG, WEBP ou GIF).' }
  }

  const adminClient = createAdminClient()
  let webpFile: File
  try {
    webpFile = await toWebP(file, { maxWidth: 1200, quality: 85 })
  } catch {
    return { error: 'Não foi possível processar esta imagem — ela pode estar corrompida ou num formato inesperado.' }
  }
  const path = `evento-gallery/${eventoId}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`

  const { error: uploadError } = await adminClient.storage.from('marketing-files').upload(path, webpFile, { contentType: webpFile.type })
  if (uploadError) return { error: uploadError.message }

  const { data: photos } = await adminClient
    .from('evento_photos')
    .select('order_index')
    .eq('evento_id', eventoId)
    .order('order_index', { ascending: false })
    .limit(1)
  const nextIndex = (photos?.[0]?.order_index ?? -1) + 1

  const { data: inserted, error: dbError } = await adminClient
    .from('evento_photos')
    .insert({ evento_id: eventoId, storage_path: path, caption, order_index: nextIndex })
    .select()
    .single()
  if (dbError) return { error: dbError.message }

  logActivity(ctx, { action: 'upload', entityType: 'evento', entityId: eventoId, entityLabel: eventoId, detail: `foto da galeria: ${caption || file.name}` })

  revalidatePath('/admin/marketing')
  const { data: item } = await adminClient.from('eventos').select('slug').eq('id', eventoId).single()
  revalidatePath(`/dashboard/eventos/${item?.slug ?? eventoId}`)

  const { data: { publicUrl } } = adminClient.storage.from('marketing-files').getPublicUrl(path)
  return { success: true, data: { ...inserted, url: publicUrl } }
}

export async function deleteEventoGalleryPhoto(photoId: string, storagePath: string, eventoId: string) {
  const ctx = await requireEventoAccess(eventoId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  await adminClient.storage.from('marketing-files').remove([storagePath])

  const [{ error }, { data: item }] = await Promise.all([
    adminClient.from('evento_photos').delete().eq('id', photoId),
    adminClient.from('eventos').select('slug').eq('id', eventoId).single(),
  ])
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'delete', entityType: 'evento', entityId: eventoId, entityLabel: eventoId, detail: 'excluiu foto da galeria' })

  revalidatePath('/admin/marketing')
  revalidatePath(`/dashboard/eventos/${item?.slug ?? eventoId}`)
  return { success: true }
}

// ── Depoimentos ──────────────────────────────────────────────────────────

export async function createEventoTestimonial(eventoId: string, formData: FormData) {
  const ctx = await requireEventoAccess(eventoId)
  if ('error' in ctx) return { error: ctx.error }

  const authorName = ((formData.get('author_name') as string) ?? '').trim()
  if (!authorName) return { error: 'Informe o nome de quem deu o depoimento.' }

  const adminClient = createAdminClient()
  const { data: existing } = await adminClient
    .from('evento_testimonials')
    .select('order_index')
    .eq('evento_id', eventoId)
    .order('order_index', { ascending: false })
    .limit(1)
  const nextIndex = (existing?.[0]?.order_index ?? -1) + 1

  const { data: inserted, error } = await adminClient.from('evento_testimonials').insert({
    evento_id: eventoId,
    author_name: authorName,
    author_role: ((formData.get('author_role') as string) ?? '').trim(),
    photo_url: ((formData.get('photo_url') as string) ?? '').trim(),
    content: ((formData.get('content') as string) ?? '').trim(),
    order_index: nextIndex,
  }).select().single()
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'create', entityType: 'evento', entityId: eventoId, entityLabel: eventoId, detail: `depoimento: ${authorName}` })

  revalidatePath('/admin/marketing')
  const { data: item } = await adminClient.from('eventos').select('slug').eq('id', eventoId).single()
  revalidatePath(`/dashboard/eventos/${item?.slug ?? eventoId}`)
  return { success: true, data: inserted }
}

export async function updateEventoTestimonial(id: string, eventoId: string, formData: FormData) {
  const ctx = await requireEventoAccess(eventoId)
  if ('error' in ctx) return { error: ctx.error }

  const authorName = ((formData.get('author_name') as string) ?? '').trim()
  if (!authorName) return { error: 'Informe o nome de quem deu o depoimento.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('evento_testimonials').update({
    author_name: authorName,
    author_role: ((formData.get('author_role') as string) ?? '').trim(),
    photo_url: ((formData.get('photo_url') as string) ?? '').trim(),
    content: ((formData.get('content') as string) ?? '').trim(),
  }).eq('id', id).eq('evento_id', eventoId)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'update', entityType: 'evento', entityId: eventoId, entityLabel: eventoId, detail: `alterou depoimento: ${authorName}` })

  revalidatePath('/admin/marketing')
  const { data: item } = await adminClient.from('eventos').select('slug').eq('id', eventoId).single()
  revalidatePath(`/dashboard/eventos/${item?.slug ?? eventoId}`)
  return { success: true }
}

export async function deleteEventoTestimonial(id: string, eventoId: string) {
  const ctx = await requireEventoAccess(eventoId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  // Confirma que o depoimento é mesmo deste evento antes de excluir — sem
  // isso, um `id` de outro evento (posse já validada pelo guard acima só
  // pro eventoId) poderia ser apagado por engano.
  const { error } = await adminClient.from('evento_testimonials').delete().eq('id', id).eq('evento_id', eventoId)
  if (error) return { error: error.message }

  logActivity(ctx, { action: 'delete', entityType: 'evento', entityId: eventoId, entityLabel: eventoId, detail: 'excluiu depoimento' })

  revalidatePath('/admin/marketing')
  const { data: item } = await adminClient.from('eventos').select('slug').eq('id', eventoId).single()
  revalidatePath(`/dashboard/eventos/${item?.slug ?? eventoId}`)
  return { success: true }
}

// Upload de foto de depoimento — só devolve a URL, não grava em tabela
// nenhuma (quem chama junta com o resto do form e salva via create/update
// testimonial acima). Mesmo tratamento de extensão/try-catch de uploadEventoCover.
export async function uploadEventoTestimonialPhoto(file: File) {
  const ctx = await requireCapability('eventos')
  if ('error' in ctx) return { error: ctx.error }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!EVENTO_COVER_EXTS.includes(ext)) {
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
  const path = `evento-testimonials/${Date.now()}-${Math.random().toString(36).slice(2)}.${isConverted ? 'webp' : ext}`

  const { error } = await adminClient.storage.from('marketing-files').upload(path, webpFile, { contentType: webpFile.type })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = adminClient.storage.from('marketing-files').getPublicUrl(path)
  return { success: true, url: publicUrl }
}
