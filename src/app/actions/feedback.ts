'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { emailAdminNewFeedback } from '@/lib/email'
import { toOne } from '@/lib/supabase/relations'
import { toWebP } from '@/lib/image'
import DOMPurify from 'isomorphic-dompurify'

// Conteúdo agora é gerado por membros comuns (não só admins) e renderizado como HTML
// no painel admin — precisa ser sanitizado antes de guardar. Allowlist casada com o
// que o RichTextEditor (Tiptap StarterKit + Underline + Link + Image) pode gerar.
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr', 'a', 'img'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class'],
}

function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, SANITIZE_CONFIG)
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export type FeedbackAttachment = {
  id: string
  url: string
  mime_type: string
}

export type FeedbackReport = {
  id: string
  user_id: string
  type: 'bug' | 'suggestion'
  title: string
  message: string
  link_url: string
  page_url: string
  status: 'open' | 'resolved'
  admin_note: string
  resolved_at: string | null
  created_at: string
  member_name: string
  attachments: FeedbackAttachment[]
}

function attachmentPublicUrl(storagePath: string): string {
  const adminClient = createAdminClient()
  return adminClient.storage.from('feedback-attachments').getPublicUrl(storagePath).data.publicUrl
}

// Upload usado tanto para imagem inline (no editor) quanto para anexo separado
export async function uploadFeedbackFile(file: File) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  if (!file.type.startsWith('image/')) return { error: 'Apenas imagens são aceitas.' }

  const MAX = 10 * 1024 * 1024
  if (file.size > MAX) return { error: 'Imagem muito grande. O limite é 10 MB.' }

  const webpFile = await toWebP(file, { maxWidth: 1600, quality: 85 })
  const isConverted = webpFile.type === 'image/webp'
  const ext = isConverted ? 'webp' : (file.name.split('.').pop() || 'jpg')
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage.from('feedback-attachments').upload(path, webpFile, { contentType: webpFile.type })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = supabase.storage.from('feedback-attachments').getPublicUrl(path)
  return { success: true, url: publicUrl, path, mimeType: webpFile.type, sizeBytes: webpFile.size }
}

export async function submitFeedback(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const type = formData.get('type') as string
  const title = (formData.get('title') as string)?.trim()
  const messageRaw = (formData.get('message') as string) || ''
  const linkUrl = (formData.get('link_url') as string)?.trim() ?? ''
  const pageUrl = (formData.get('page_url') as string) || ''
  const attachmentsRaw = (formData.get('attachments') as string) || '[]'

  if (!['bug', 'suggestion'].includes(type)) return { error: 'Tipo inválido.' }
  if (!title) return { error: 'Dê um título para o chamado.' }

  const message = sanitizeRichText(messageRaw)
  const messageText = stripHtml(message)
  if (!messageText) return { error: 'Descreva o problema ou sugestão.' }

  if (linkUrl) {
    try { new URL(linkUrl) } catch { return { error: 'Link inválido. Cole uma URL completa (https://...).' } }
  }

  let attachments: { path: string; mimeType: string; sizeBytes: number }[] = []
  try {
    const parsed = JSON.parse(attachmentsRaw)
    if (Array.isArray(parsed)) attachments = parsed
  } catch { /* ignora anexos malformados */ }

  const { data: inserted, error } = await supabase
    .from('feedback_reports')
    .insert({ user_id: user.id, type, title, message, link_url: linkUrl, page_url: pageUrl })
    .select('id')
    .single()
  if (error) return { error: error.message }

  if (attachments.length > 0) {
    await supabase.from('feedback_attachments').insert(
      attachments.map((a) => ({
        feedback_id: inserted.id,
        storage_path: a.path,
        mime_type: a.mimeType,
        size_bytes: a.sizeBytes,
      }))
    )
  }

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient.from('profiles').select('full_name').eq('id', user.id).single()
  emailAdminNewFeedback(profile?.full_name ?? '', user.email ?? '', type, title, messageText.slice(0, 300))

  revalidatePath('/dashboard/feedback')
  return { success: true }
}

async function mapReports(rows: {
  id: string; user_id: string; type: 'bug' | 'suggestion'; title: string; message: string
  link_url: string; page_url: string; status: 'open' | 'resolved'; admin_note: string
  resolved_at: string | null; created_at: string
  profiles: { full_name: string }[] | { full_name: string } | null
  feedback_attachments: { id: string; storage_path: string; mime_type: string }[]
}[]): Promise<FeedbackReport[]> {
  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    type: r.type,
    title: r.title,
    message: r.message,
    link_url: r.link_url,
    page_url: r.page_url,
    status: r.status,
    admin_note: r.admin_note,
    resolved_at: r.resolved_at,
    created_at: r.created_at,
    member_name: toOne(r.profiles)?.full_name ?? '',
    attachments: (r.feedback_attachments ?? []).map((a) => ({
      id: a.id,
      url: attachmentPublicUrl(a.storage_path),
      mime_type: a.mime_type,
    })),
  }))
}

export async function getFeedbackReports(): Promise<FeedbackReport[]> {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('feedback_reports')
    .select('id, user_id, type, title, message, link_url, page_url, status, admin_note, resolved_at, created_at, profiles(full_name), feedback_attachments(id, storage_path, mime_type)')
    .order('created_at', { ascending: false })

  return mapReports(data ?? [])
}

export async function getMyFeedbackReports(): Promise<FeedbackReport[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('feedback_reports')
    .select('id, user_id, type, title, message, link_url, page_url, status, admin_note, resolved_at, created_at, profiles(full_name), feedback_attachments(id, storage_path, mime_type)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return mapReports(data ?? [])
}

export async function resolveFeedback(id: string, resolved: boolean, adminNote?: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('feedback_reports').update({
    status: resolved ? 'resolved' : 'open',
    resolved_at: resolved ? new Date().toISOString() : null,
    ...(adminNote !== undefined ? { admin_note: adminNote } : {}),
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/feedback')
  return { success: true }
}
