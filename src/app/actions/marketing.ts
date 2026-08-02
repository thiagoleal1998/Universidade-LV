'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, requireCapability, requireAnyCapability, requireContentAccess } from '@/lib/authz'
import { capabilityForMarketingCategory, MARKETING_CAPABILITIES } from '@/lib/capabilities'
import { logActivity, diffFields } from '@/lib/activity-log'
import { revalidatePath } from 'next/cache'
import { toWebP } from '@/lib/image'
import { extractYouTubeId } from '@/lib/youtube'

export type MarketingCategory = string

// Categoria 'link' (Links Úteis) é uma linha de lista cuja ÚNICA ação é abrir
// a URL — sem ela o item é inútil. Bug real corrigido (v1.111.5): itens eram
// criados com url vazia ou sem protocolo (ex.: "www.drive.com.br"), e o botão
// "Abrir" (`<a href={url} target="_blank">`, sem checar vazio) resolvia como
// link relativo à própria página admin — url vazia reabre a página atual
// (reset do state de aba pra "Materiais Visuais"), url sem protocolo vira uma
// rota interna inexistente (404). Mesmo padrão de validação de `submitFeedback`
// (feedback.ts): exige URL completa com protocolo antes de salvar.
function validateItemUrl(category: MarketingCategory, url: string): { error: string } | null {
  if (category === 'link' && !url) return { error: 'Informe a URL do link.' }
  if (url) {
    try { new URL(url) } catch { return { error: 'Link inválido. Cole uma URL completa (ex.: https://...).' } }
  }
  return null
}

export type MarketingProduct = {
  id: string
  name: string
  created_at: string
}

export type MarketingPeriod = {
  id: string
  name: string
  created_at: string
}

export async function getMarketingProducts(): Promise<MarketingProduct[]> {
  const adminClient = createAdminClient()
  const { data } = await adminClient.from('marketing_products').select('*').order('name')
  return (data ?? []) as MarketingProduct[]
}

export async function createMarketingProduct(name: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const adminClient = createAdminClient()
  if (!name.trim()) return { error: 'Nome obrigatório' }
  const { error } = await adminClient.from('marketing_products').insert({ name: name.trim() })
  if (error) return { error: error.message }
  logActivity(auth, { action: 'create', entityType: 'produto_marketing', entityLabel: name.trim() })
  revalidatePath('/admin/marketing')
  return { success: true }
}

export async function updateMarketingProduct(id: string, name: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const adminClient = createAdminClient()
  if (!name.trim()) return { error: 'Nome obrigatório' }
  const { error } = await adminClient.from('marketing_products').update({ name: name.trim() }).eq('id', id)
  if (error) return { error: error.message }
  logActivity(auth, { action: 'update', entityType: 'produto_marketing', entityId: id, entityLabel: name.trim() })
  revalidatePath('/admin/marketing')
  return { success: true }
}

export async function deleteMarketingProduct(id: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const adminClient = createAdminClient()
  const { data: product } = await adminClient.from('marketing_products').select('name').eq('id', id).single()
  const { error } = await adminClient.from('marketing_products').delete().eq('id', id)
  if (error) return { error: error.message }
  logActivity(auth, { action: 'delete', entityType: 'produto_marketing', entityId: id, entityLabel: product?.name ?? id })
  revalidatePath('/admin/marketing')
  return { success: true }
}

export async function getMarketingPeriods(): Promise<MarketingPeriod[]> {
  const adminClient = createAdminClient()
  const { data } = await adminClient.from('marketing_periods').select('*').order('name')
  return (data ?? []) as MarketingPeriod[]
}

export async function createMarketingPeriod(name: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const adminClient = createAdminClient()
  if (!name.trim()) return { error: 'Nome obrigatório' }
  const { error } = await adminClient.from('marketing_periods').insert({ name: name.trim() })
  if (error) return { error: error.message }
  logActivity(auth, { action: 'create', entityType: 'periodo_marketing', entityLabel: name.trim() })
  revalidatePath('/admin/marketing')
  return { success: true }
}

export async function deleteMarketingPeriod(id: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const adminClient = createAdminClient()
  const { data: period } = await adminClient.from('marketing_periods').select('name').eq('id', id).single()
  const { error } = await adminClient.from('marketing_periods').delete().eq('id', id)
  if (error) return { error: error.message }
  logActivity(auth, { action: 'delete', entityType: 'periodo_marketing', entityId: id, entityLabel: period?.name ?? id })
  revalidatePath('/admin/marketing')
  return { success: true }
}

export async function createMarketingItem(data: {
  category: MarketingCategory
  title: string
  description: string
  content: string
  url: string
  audience?: string
  scope?: string
  product_id?: string
  period_id?: string
  travel_period?: string
  status?: string
  publish_at?: string
  expires_at?: string
  allowed_tag_ids?: string[]
}) {
  const ctx = await requireCapability(capabilityForMarketingCategory(data.category))
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  if (!data.title.trim()) return { error: 'Título obrigatório' }
  const urlError = validateItemUrl(data.category, data.url.trim())
  if (urlError) return { error: urlError.error }

  const { data: existing } = await adminClient
    .from('marketing_items')
    .select('order_index')
    .eq('category', data.category)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextIndex = (existing?.[0]?.order_index ?? -1) + 1

  const { data: inserted, error } = await adminClient.from('marketing_items').insert({
    category: data.category,
    title: data.title.trim(),
    description: data.description.trim(),
    content: data.content,
    url: data.url.trim(),
    audience: data.audience || null,
    scope: data.scope || null,
    product_id: data.product_id || null,
    period_id: data.period_id || null,
    travel_period: data.travel_period?.trim() || null,
    status: data.status || 'published',
    publish_at: data.publish_at || ((data.status ?? 'published') === 'published' ? new Date().toISOString() : null),
    expires_at: data.expires_at || null,
    allowed_tag_ids: data.allowed_tag_ids ?? [],
    order_index: nextIndex,
    owner_area_id: ctx.areaId,
  }).select('id').single()

  if (error) return { error: error.message }
  logActivity(ctx, { action: 'create', entityType: 'item_marketing', entityId: inserted?.id, entityLabel: data.title.trim(), detail: `categoria: ${data.category}` })
  revalidatePath('/admin/marketing')
  return { success: true }
}

// Guard de posse: busca categoria + dono do item e valida capacidade + área
async function requireMarketingItemAccess(id: string) {
  const adminClient = createAdminClient()
  const { data: item } = await adminClient
    .from('marketing_items')
    .select('category, owner_area_id')
    .eq('id', id)
    .single()
  if (!item) return { error: 'Item não encontrado.' }
  return requireContentAccess(capabilityForMarketingCategory(item.category), item.owner_area_id)
}

export async function updateMarketingItem(
  id: string,
  data: {
    title: string
    description: string
    content: string
    url: string
    audience?: string
    scope?: string
    product_id?: string
    period_id?: string
    travel_period?: string
    status?: string
    publish_at?: string
    expires_at?: string
    allowed_tag_ids?: string[]
  },
) {
  const ctx = await requireMarketingItemAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  if (!data.title.trim()) return { error: 'Título obrigatório' }

  const { data: prev } = await adminClient
    .from('marketing_items')
    .select('category, title, description, content, url, status, publish_at, expires_at')
    .eq('id', id)
    .single()

  const urlError = prev ? validateItemUrl(prev.category, data.url.trim()) : null
  if (urlError) return { error: urlError.error }

  const after = {
    title: data.title.trim(),
    description: data.description.trim(),
    content: data.content,
    url: data.url.trim(),
    audience: data.audience || null,
    scope: data.scope || null,
    product_id: data.product_id || null,
    period_id: data.period_id || null,
    travel_period: data.travel_period?.trim() || null,
    status: data.status || 'published',
    publish_at: data.publish_at || ((data.status ?? 'published') === 'published' ? new Date().toISOString() : null),
    expires_at: data.expires_at || null,
    allowed_tag_ids: data.allowed_tag_ids ?? [],
  }
  const { error } = await adminClient
    .from('marketing_items')
    .update(after)
    .eq('id', id)

  if (error) return { error: error.message }

  const changed = diffFields(prev ?? {}, after, {
    title: 'título', description: 'descrição', content: 'conteúdo', url: 'link',
    status: 'status', publish_at: 'publicação', expires_at: 'expiração',
  })
  if (changed.length > 0) {
    logActivity(ctx, { action: 'update', entityType: 'item_marketing', entityId: id, entityLabel: data.title.trim(), detail: `alterou: ${changed.join(', ')}` })
  }

  revalidatePath('/admin/marketing')
  return { success: true }
}

export async function deleteMarketingItem(id: string) {
  const ctx = await requireMarketingItemAccess(id)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: item } = await adminClient.from('marketing_items').select('title').eq('id', id).single()
  const { error } = await adminClient.from('marketing_items').delete().eq('id', id)
  if (error) return { error: error.message }
  logActivity(ctx, { action: 'delete', entityType: 'item_marketing', entityId: id, entityLabel: item?.title ?? id })
  revalidatePath('/admin/marketing')
  return { success: true }
}

// Extensão → MIME canônico aceito no bucket `marketing-files`. Extensão é a
// fonte de verdade (não `file.type`) porque o navegador não é confiável: .ai
// e .psd costumam chegar como `application/octet-stream` (ou vazio), e ainda
// assim precisam ser aceitos pelo grupo 'material' — mesmo raciocínio já
// documentado para anexos de feedback (Word/Excel via MIME sniffing ruim).
const MARKETING_MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
  pdf: 'application/pdf',
  zip: 'application/zip',
  ai: 'application/postscript',
  psd: 'image/vnd.adobe.photoshop',
}

// Cada chamador declara o que o próprio campo já promete no `accept` do
// input — sem isso, o `accept` do HTML é só um filtro de UI (a pessoa pode
// escolher "Todos os arquivos" no seletor do SO) e nada no servidor barrava
// vídeo/executável/planilha antes desta validação existir (bug real
// relatado: Excel e vídeo aceitos nos campos de logo/lâmina da Corrida de
// Vendas — Excel baixava direto sem preview, vídeo caía numa página de erro
// porque o arquivo nem chegava a subir direito).
const MARKETING_UPLOAD_KINDS = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'],
  image_pdf: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'pdf'],
  material: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'pdf', 'zip', 'ai', 'psd'],
} as const
export type MarketingUploadKind = keyof typeof MARKETING_UPLOAD_KINDS

const MARKETING_UPLOAD_KIND_ERROR: Record<MarketingUploadKind, string> = {
  image: 'Apenas imagens são aceitas (JPG, PNG, WEBP, GIF ou SVG).',
  image_pdf: 'Apenas imagem ou PDF são aceitos.',
  material: 'Tipo de arquivo não suportado. Envie imagem, PDF, ZIP, AI ou PSD.',
}

function resolveMarketingMime(file: File, kind: MarketingUploadKind): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!(MARKETING_UPLOAD_KINDS[kind] as readonly string[]).includes(ext)) return null
  return MARKETING_MIME_BY_EXT[ext] ?? file.type
}

export async function uploadMarketingFile(file: File, kind: MarketingUploadKind) {
  // Qualquer capacidade de marketing serve para upload de arquivo
  const ctx = await requireAnyCapability(MARKETING_CAPABILITIES)
  if ('error' in ctx) return { error: ctx.error }

  const mime = resolveMarketingMime(file, kind)
  if (!mime) return { error: MARKETING_UPLOAD_KIND_ERROR[kind] }

  // Reembrulha com o MIME resolvido: sem isso, um .psd/.ai que o navegador
  // reporta como octet-stream não seria reconhecido como imagem por toWebP.
  const normalized = file.type === mime ? file : new File([file], file.name, { type: mime })

  const adminClient = createAdminClient()
  let outFile: File
  try {
    // sharp (dentro de toWebP) lança exceção síncrona/rejeitada pra imagem
    // corrompida/malformada — sem o try/catch, isso derruba a Server Action
    // inteira ("This page couldn't load", confirmado testando com um PNG
    // com bytes inválidos), em vez de virar um toast de erro normal.
    outFile = await toWebP(normalized, { maxWidth: 1280, quality: 85 })
  } catch {
    return { error: 'Não foi possível processar este arquivo — ele pode estar corrompido ou num formato inesperado.' }
  }
  const isConverted = outFile.type === 'image/webp'
  const ext = isConverted ? 'webp' : file.name.split('.').pop()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await adminClient.storage.from('marketing-files').upload(path, outFile, { contentType: outFile.type })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = adminClient.storage.from('marketing-files').getPublicUrl(path)
  return { success: true, url: publicUrl }
}

export type YoutubeEpisodeMetadata = { title: string; description: string; cover_url: string }

// Busca título (oEmbed), capa (thumbnail) e descrição (meta tag) de um vídeo do YouTube.
// Não depende de chave de API — usa o endpoint público de oEmbed e a meta description da página.
export async function fetchYoutubeEpisodeMetadata(
  url: string
): Promise<{ success: true; data: YoutubeEpisodeMetadata } | { error: string }> {
  const videoId = extractYouTubeId((url || '').trim())
  if (!videoId) return { error: 'Cole um link válido do YouTube (youtube.com/watch?v=... ou youtu.be/...).' }

  let title = ''
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
    )
    if (!oembedRes.ok) return { error: 'Vídeo não encontrado no YouTube. Verifique o link.' }
    const oembed = (await oembedRes.json()) as { title?: string }
    title = oembed.title ?? ''
  } catch {
    return { error: 'Não foi possível conectar ao YouTube. Tente novamente.' }
  }

  let description = ''
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (pageRes.ok) {
      const html = await pageRes.text()
      const match = html.match(/<meta name="description" content="([^"]*)"/)
      if (match) {
        description = match[1]
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&')
      }
    }
  } catch {
    // descrição é best-effort — segue sem ela se falhar
  }

  let cover_url = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  try {
    const imgRes = await fetch(cover_url, { method: 'HEAD' })
    if (!imgRes.ok) cover_url = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  } catch {
    cover_url = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  }

  return { success: true, data: { title, description, cover_url } }
}
