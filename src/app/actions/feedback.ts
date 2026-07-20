'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { emailAdminNewFeedback } from '@/lib/email'
import { notifyAllAdmins, notifyUser } from '@/app/actions/notifications'
import { toOne } from '@/lib/supabase/relations'
import { toWebP } from '@/lib/image'
import DOMPurify from 'isomorphic-dompurify'
import { logActivity } from '@/lib/activity-log'
import type { AdminContext } from '@/lib/authz'

// feedback.ts tem seu próprio requireAdmin() local (retorna só { userId }),
// não o AdminContext completo de authz.ts — este helper monta um AdminContext
// mínimo (role sempre 'admin', já que o guard local só deixa admin passar)
// só para poder chamar logActivity com a mesma assinatura do resto do projeto.
function toAdminContext(userId: string): AdminContext {
  return { userId, role: 'admin', areaId: null, capabilities: [] }
}

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

export type FeedbackStatus = 'open' | 'in_progress' | 'resolved'

export type FeedbackAttachment = {
  id: string
  url: string
  mime_type: string
}

export type FeedbackEvent = {
  id: string
  event_type: 'created' | 'assigned' | 'status_changed' | 'note_added'
  actor_name: string
  from_status: FeedbackStatus | null
  to_status: FeedbackStatus | null
  assigned_name: string | null
  note_text: string | null
  created_at: string
}

export type FeedbackReport = {
  id: string
  user_id: string
  type: 'bug' | 'suggestion'
  title: string
  message: string
  link_url: string
  page_url: string
  status: FeedbackStatus
  assigned_to: string | null
  assigned_name: string
  resolved_at: string | null
  created_at: string
  member_name: string
  attachments: FeedbackAttachment[]
  events: FeedbackEvent[]
}

// Confirma que o usuário logado é admin — usado pelas ações que só o admin
// pode executar (atribuir responsável, mudar status). Sem essa checagem, a
// RLS de feedback_reports bloquearia o UPDATE silenciosamente (0 linhas
// afetadas, sem erro), mas o código seguiria inserindo evento/notificação
// como se a mudança tivesse realmente acontecido.
async function requireAdmin(): Promise<{ error: string } | { userId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Apenas admins podem fazer isso.' }

  return { userId: user.id }
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
  const typeLabel = type === 'bug' ? 'Bug' : 'Sugestão'
  const memberName = profile?.full_name ?? ''

  await adminClient.from('feedback_events').insert({
    feedback_id: inserted.id,
    event_type: 'created',
    actor_name: memberName,
  })

  emailAdminNewFeedback(memberName, user.email ?? '', type, title, messageText.slice(0, 300))
  await notifyAllAdmins(user.id, {
    type: 'new_feedback',
    title: `[${typeLabel}] ${title}`,
    body: `${memberName || user.email} — ${messageText.slice(0, 140)}`,
    link: '/admin/feedback',
  })

  revalidatePath('/dashboard/feedback')
  return { success: true }
}

type ReportRow = {
  id: string; user_id: string; type: 'bug' | 'suggestion'; title: string; message: string
  link_url: string; page_url: string; status: FeedbackStatus; assigned_to: string | null
  resolved_at: string | null; created_at: string
  profiles: { full_name: string }[] | { full_name: string } | null
  assigned: { full_name: string }[] | { full_name: string } | null
  feedback_attachments: { id: string; storage_path: string; mime_type: string }[]
  feedback_events: {
    id: string; event_type: FeedbackEvent['event_type']; actor_name: string
    from_status: FeedbackStatus | null; to_status: FeedbackStatus | null
    assigned_name: string | null; note_text: string | null; created_at: string
  }[]
}

function mapReports(rows: ReportRow[]): FeedbackReport[] {
  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    type: r.type,
    title: r.title,
    message: r.message,
    link_url: r.link_url,
    page_url: r.page_url,
    status: r.status,
    assigned_to: r.assigned_to,
    assigned_name: toOne(r.assigned)?.full_name ?? '',
    resolved_at: r.resolved_at,
    created_at: r.created_at,
    member_name: toOne(r.profiles)?.full_name ?? '',
    attachments: (r.feedback_attachments ?? []).map((a) => ({
      id: a.id,
      url: attachmentPublicUrl(a.storage_path),
      mime_type: a.mime_type,
    })),
    events: (r.feedback_events ?? [])
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((e) => ({
        id: e.id,
        event_type: e.event_type,
        actor_name: e.actor_name,
        from_status: e.from_status,
        to_status: e.to_status,
        assigned_name: e.assigned_name,
        note_text: e.note_text,
        created_at: e.created_at,
      })),
  }))
}

const REPORT_SELECT = `
  id, user_id, type, title, message, link_url, page_url, status, assigned_to, resolved_at, created_at,
  profiles!feedback_reports_user_id_fkey(full_name),
  assigned:profiles!feedback_reports_assigned_to_fkey(full_name),
  feedback_attachments(id, storage_path, mime_type),
  feedback_events(id, event_type, actor_name, from_status, to_status, assigned_name, note_text, created_at)
`

export async function getFeedbackReports(): Promise<FeedbackReport[]> {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('feedback_reports')
    .select(REPORT_SELECT)
    .order('created_at', { ascending: false })

  return mapReports((data ?? []) as unknown as ReportRow[])
}

export async function getMyFeedbackReports(): Promise<FeedbackReport[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Usa adminClient (com filtro explícito por user_id) em vez do client de sessão:
  // a RLS de profiles só deixa o membro ler o próprio perfil, então o join do nome
  // do admin responsável (profiles via assigned_to) voltaria vazio com RLS ativa.
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('feedback_reports')
    .select(REPORT_SELECT)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return mapReports((data ?? []) as unknown as ReportRow[])
}

export type AdminOption = { id: string; full_name: string }

export async function getAdmins(): Promise<AdminOption[]> {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'admin')
    .eq('active', true)
    .order('full_name')

  return (data ?? []) as AdminOption[]
}

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  resolved: 'Finalizado',
}

export async function assignFeedback(id: string, assignedTo: string | null) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: report } = await adminClient.from('feedback_reports').select('user_id, title').eq('id', id).single()
  if (!report) return { error: 'Chamado não encontrado.' }

  const assignedName = assignedTo
    ? (await adminClient.from('profiles').select('full_name').eq('id', assignedTo).single()).data?.full_name ?? ''
    : ''

  const { error } = await supabase.from('feedback_reports').update({ assigned_to: assignedTo }).eq('id', id)
  if (error) return { error: error.message }

  await adminClient.from('feedback_events').insert({
    feedback_id: id,
    event_type: 'assigned',
    actor_name: '',
    assigned_name: assignedName,
  })

  logActivity(toAdminContext(auth.userId), {
    action: 'update', entityType: 'feedback', entityId: id, entityLabel: report.title || 'Sem título',
    detail: assignedTo ? `atribuiu a ${assignedName}` : 'removeu atribuição',
  })

  const title = report.title || 'Sem título'
  await notifyUser(report.user_id, {
    type: 'feedback_update',
    title: assignedTo ? `Seu chamado foi atribuído a ${assignedName}` : `Atribuição removida do seu chamado`,
    body: title,
    link: '/dashboard/feedback',
  })

  revalidatePath('/admin/feedback')
  revalidatePath('/dashboard/feedback')
  return { success: true }
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: report } = await adminClient.from('feedback_reports').select('user_id, title, status').eq('id', id).single()
  if (!report) return { error: 'Chamado não encontrado.' }
  if (report.status === status) return { success: true }

  const { error } = await supabase.from('feedback_reports').update({
    status,
    resolved_at: status === 'resolved' ? new Date().toISOString() : null,
  }).eq('id', id)
  if (error) return { error: error.message }

  await adminClient.from('feedback_events').insert({
    feedback_id: id,
    event_type: 'status_changed',
    actor_name: '',
    from_status: report.status,
    to_status: status,
  })

  logActivity(toAdminContext(auth.userId), {
    action: 'toggle', entityType: 'feedback', entityId: id, entityLabel: report.title || 'Sem título',
    detail: `status: ${STATUS_LABEL[report.status as FeedbackStatus]} → ${STATUS_LABEL[status]}`,
  })

  const title = report.title || 'Sem título'
  await notifyUser(report.user_id, {
    type: 'feedback_update',
    title: `Chamado ${STATUS_LABEL[status].toLowerCase()}: ${title}`,
    body: `Status alterado de "${STATUS_LABEL[report.status as FeedbackStatus]}" para "${STATUS_LABEL[status]}".`,
    link: '/dashboard/feedback',
  })

  revalidatePath('/admin/feedback')
  revalidatePath('/dashboard/feedback')
  return { success: true }
}

// Chamado tanto pelo admin (responder um chamado) quanto pelo membro (responder
// no próprio chamado) — por isso a autorização checa os dois casos, e a
// notificação vai para "quem não escreveu": admin escreveu -> avisa o membro
// dono; membro escreveu -> avisa o responsável (ou todos os admins, se ninguém
// foi atribuído ainda).
export async function addFeedbackNote(id: string, note: string) {
  const sanitized = sanitizeRichText(note)
  const preview = stripHtml(sanitized)
  if (!preview) return { error: 'Escreva algo antes de salvar.' }

  const supabase = await createClient()
  const { data: { user: actor } } = await supabase.auth.getUser()
  if (!actor) return { error: 'Não autenticado.' }

  const adminClient = createAdminClient()

  const { data: report } = await adminClient.from('feedback_reports').select('user_id, title, assigned_to').eq('id', id).single()
  if (!report) return { error: 'Chamado não encontrado.' }

  const { data: actorProfile } = await adminClient.from('profiles').select('full_name, role').eq('id', actor.id).single()
  const isAdminActor = actorProfile?.role === 'admin'

  if (!isAdminActor && actor.id !== report.user_id) {
    return { error: 'Você não tem permissão para responder este chamado.' }
  }

  await adminClient.from('feedback_events').insert({
    feedback_id: id,
    event_type: 'note_added',
    actor_name: actorProfile?.full_name ?? '',
    note_text: sanitized,
  })

  // Só loga em admin_activity_log quando quem respondeu é admin — resposta do
  // próprio membro no seu chamado não é "atividade administrativa" (já fica
  // registrada em feedback_events, que cobre a timeline de ambos os lados).
  if (isAdminActor) {
    logActivity(toAdminContext(actor.id), {
      action: 'update', entityType: 'feedback', entityId: id, entityLabel: report.title || 'Sem título', detail: 'respondeu',
    })
  }

  const title = report.title || 'Sem título'
  const body = preview.slice(0, 140)

  if (isAdminActor) {
    await notifyUser(report.user_id, {
      type: 'feedback_update',
      title: `Nova resposta no seu chamado: ${title}`,
      body,
      link: '/dashboard/feedback',
    })
  } else if (report.assigned_to) {
    await notifyUser(report.assigned_to, {
      type: 'feedback_update',
      title: `Nova resposta no chamado: ${title}`,
      body,
      link: '/admin/feedback',
    })
  } else {
    await notifyAllAdmins(actor.id, {
      type: 'feedback_update',
      title: `Nova resposta no chamado: ${title}`,
      body,
      link: '/admin/feedback',
    })
  }

  revalidatePath('/admin/feedback')
  revalidatePath('/dashboard/feedback')
  return { success: true }
}
