'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { rdAdminNewFeedback, rdFeedbackOpened, rdFeedbackInProgress, rdFeedbackResolved, getMemberEmailAndName } from '@/lib/rdstation'
import { notifyAllAdmins, notifyUser } from '@/app/actions/notifications'
import { toOne } from '@/lib/supabase/relations'
import { toWebP } from '@/lib/image'
import DOMPurify from 'isomorphic-dompurify'
import { logActivity } from '@/lib/activity-log'
import type { AdminContext } from '@/lib/authz'
import {
  notionCreateFeedbackTicket,
  notionUpdateFeedbackStatus,
  notionUpdateFeedbackAssignee,
  notionAppendTimelineRow,
  timelineRowAssigned,
  timelineRowStatusChanged,
  timelineRowNote,
} from '@/lib/notion'

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
// `width`/`height` entraram pro redimensionamento de imagem (Image.configure({
// resize: {...} }), nativo do @tiptap/extension-image 3.28 — grava como atributo
// HTML puro (`width="320"`), não `style`, então não precisa de sanitização extra
// de CSS: são só números, sem superfície de ataque.
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr', 'a', 'img'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'width', 'height'],
}

function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, SANITIZE_CONFIG)
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// Mensagem só com imagem colada (sem nenhum texto) é conteúdo válido — sem
// esta checagem, stripHtml devolve string vazia e a validação abaixo
// rejeitaria um chamado/resposta que só tem um print, mesmo com upload certo.
function hasContent(html: string): boolean {
  return !!stripHtml(html) || /<img[\s/]/i.test(html)
}

export type FeedbackStatus = 'open' | 'in_progress' | 'resolved'

export type FeedbackAttachment = {
  id: string
  url: string
  mime_type: string
  file_name: string
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
  is_deleted: boolean
  edited_at: string | null
  attachments: FeedbackAttachment[]
}

export type FeedbackReport = {
  id: string
  ticket_number: number
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

// Upload de imagem inline no editor de texto rico — só imagem, vira <img> no HTML.
export async function uploadFeedbackFile(file: File) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  if (!file.type.startsWith('image/')) return { error: 'Apenas imagens são aceitas.' }

  const MAX = 10 * 1024 * 1024
  if (file.size > MAX) return { error: 'Imagem muito grande. O limite é 10 MB.' }

  // toWebP() (sharp) lança exceção síncrona/rejeitada pra imagem corrompida —
  // sem o try/catch isso derruba a página inteira ("This page couldn't
  // load"), mesma classe de bug já corrigida em uploadMarketingFile/
  // uploadFamtourCover.
  let webpFile: File
  try {
    webpFile = await toWebP(file, { maxWidth: 1600, quality: 85 })
  } catch {
    return { error: 'Não foi possível processar esta imagem — ela pode estar corrompida ou num formato inesperado.' }
  }
  const isConverted = webpFile.type === 'image/webp'
  const ext = isConverted ? 'webp' : (file.name.split('.').pop() || 'jpg')
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage.from('feedback-attachments').upload(path, webpFile, { contentType: webpFile.type })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = supabase.storage.from('feedback-attachments').getPublicUrl(path)
  return { success: true, url: publicUrl, path, mimeType: webpFile.type, sizeBytes: webpFile.size }
}

// Extensão → MIME canônico. A extensão é a fonte de verdade porque o
// navegador NÃO é confiável aqui: um .docx vindo de máquina Windows sem a
// associação registrada chega como 'application/octet-stream' (ou vazio),
// e tanto a validação quanto o bucket rejeitariam um arquivo legítimo.
const ATTACHMENT_MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain', csv: 'text/csv',
}
const ALLOWED_ATTACHMENT_MIME = Object.values(ATTACHMENT_MIME_BY_EXT)

// Resolve o tipo real do anexo. Aceita o MIME do navegador quando ele é
// reconhecido; senão cai na extensão. Devolve null quando nenhum dos dois
// bate — aí o arquivo é mesmo de um tipo não suportado.
function resolveAttachmentMime(file: File): string | null {
  if (ALLOWED_ATTACHMENT_MIME.includes(file.type)) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return ATTACHMENT_MIME_BY_EXT[ext] ?? null
}

// Extensão canônica de um MIME permitido (o primeiro match do mapa).
function extForMime(mime: string): string {
  return Object.keys(ATTACHMENT_MIME_BY_EXT).find((k) => ATTACHMENT_MIME_BY_EXT[k] === mime) ?? 'bin'
}

// Nome exibido e usado no download. Troca a extensão original pela do tipo
// realmente aceito, para o outro lado do chamado nunca baixar um arquivo com
// extensão diferente do conteúdo que o servidor validou.
function safeFileName(original: string, ext: string): string {
  const base = original.replace(/\.[^.]*$/, '').replace(/[/\\]/g, '_').slice(0, 120) || 'arquivo'
  return `${base}.${ext}`
}

// Upload de anexo separado do chamado — aceita imagem (print) e documento
// (PDF/Word/Excel/texto).
export async function uploadFeedbackAttachment(file: File) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const mime = resolveAttachmentMime(file)
  if (!mime) {
    return { error: 'Tipo de arquivo não suportado. Envie imagem, PDF, Word, Excel ou texto.' }
  }

  const MAX = 10 * 1024 * 1024
  if (file.size > MAX) return { error: 'Arquivo muito grande. O limite é 10 MB.' }

  // Reembrulha com o MIME resolvido: sem isso, toWebP() não reconheceria uma
  // imagem que chegou como octet-stream, e o bucket (que tem allowlist de
  // MIME própria) recusaria o upload.
  const normalized = file.type === mime ? file : new File([file], file.name, { type: mime })

  let uploadFile: File
  try {
    uploadFile = await toWebP(normalized, { maxWidth: 1600, quality: 85 })
  } catch {
    return { error: 'Não foi possível processar este arquivo — ele pode estar corrompido ou num formato inesperado.' }
  }
  const isConverted = uploadFile.type === 'image/webp' && mime !== 'image/webp'
  // Extensão vem do tipo RESOLVIDO, nunca do nome original: um arquivo
  // chamado "x.exe" enviado com MIME de PDF seria salvo como .exe e baixado
  // como executável pelo outro lado do chamado.
  const ext = isConverted ? 'webp' : extForMime(uploadFile.type)
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage.from('feedback-attachments').upload(path, uploadFile, { contentType: uploadFile.type })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = supabase.storage.from('feedback-attachments').getPublicUrl(path)
  return {
    success: true, url: publicUrl, path,
    mimeType: uploadFile.type, sizeBytes: uploadFile.size,
    fileName: safeFileName(file.name, ext),
  }
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
  if (!hasContent(message)) return { error: 'Descreva o problema ou sugestão.' }

  if (linkUrl) {
    try { new URL(linkUrl) } catch { return { error: 'Link inválido. Cole uma URL completa (https://...).' } }
  }

  let attachments: { path: string; mimeType: string; sizeBytes: number; fileName?: string }[] = []
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
        file_name: a.fileName || '',
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

  const messagePreview = messageText.slice(0, 300) || '📎 Chamado com imagem, sem texto'
  rdAdminNewFeedback(memberName, user.email ?? '', type, title, messagePreview)
  await notifyAllAdmins(user.id, {
    type: 'new_feedback',
    title: `[${typeLabel}] ${title}`,
    body: `${memberName || user.email} — ${messagePreview.slice(0, 140)}`,
    link: `/admin/feedback?report=${inserted.id}`,
  })
  rdFeedbackOpened(user.email ?? '', memberName, title, `/dashboard/feedback?tab=minhas&report=${inserted.id}`)

  // Espelha o chamado no Notion (fire-and-forget) e grava o page_id de volta
  // pra os próximos eventos (atribuição/status/resposta) saberem qual página
  // atualizar. No-op silencioso se NOTION_API_KEY não estiver configurada.
  notionCreateFeedbackTicket({
    title,
    type: type as 'bug' | 'suggestion',
    status: 'open',
    authorName: memberName,
    messageText: messagePreview,
    pageUrl,
    createdAtIso: new Date().toISOString(),
  }).then(async (pageId) => {
    if (pageId) await adminClient.from('feedback_reports').update({ notion_page_id: pageId }).eq('id', inserted.id)
  })

  revalidatePath('/dashboard/feedback')
  return { success: true }
}

type ReportRow = {
  id: string; ticket_number: number; user_id: string; type: 'bug' | 'suggestion'; title: string; message: string
  link_url: string; page_url: string; status: FeedbackStatus; assigned_to: string | null
  resolved_at: string | null; created_at: string
  profiles: { full_name: string }[] | { full_name: string } | null
  assigned: { full_name: string }[] | { full_name: string } | null
  feedback_attachments: { id: string; storage_path: string; mime_type: string; file_name: string; event_id: string | null }[]
  feedback_events: {
    id: string; event_type: FeedbackEvent['event_type']; actor_name: string
    from_status: FeedbackStatus | null; to_status: FeedbackStatus | null
    assigned_name: string | null; note_text: string | null; created_at: string
    is_deleted: boolean; edited_at: string | null
    feedback_attachments: { id: string; storage_path: string; mime_type: string; file_name: string }[]
  }[]
}

function mapReports(rows: ReportRow[]): FeedbackReport[] {
  return rows.map((r) => ({
    id: r.id,
    ticket_number: r.ticket_number,
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
    attachments: (r.feedback_attachments ?? []).filter((a) => !a.event_id).map((a) => ({
      id: a.id,
      url: attachmentPublicUrl(a.storage_path),
      mime_type: a.mime_type,
      file_name: a.file_name || '',
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
        is_deleted: e.is_deleted,
        edited_at: e.edited_at,
        attachments: (e.feedback_attachments ?? []).map((a) => ({
          id: a.id,
          url: attachmentPublicUrl(a.storage_path),
          mime_type: a.mime_type,
          file_name: a.file_name || '',
        })),
      })),
  }))
}

const REPORT_SELECT = `
  id, ticket_number, user_id, type, title, message, link_url, page_url, status, assigned_to, resolved_at, created_at,
  profiles!feedback_reports_user_id_fkey(full_name),
  assigned:profiles!feedback_reports_assigned_to_fkey(full_name),
  feedback_attachments!feedback_attachments_feedback_id_fkey(id, storage_path, mime_type, file_name, event_id),
  feedback_events(id, event_type, actor_name, from_status, to_status, assigned_name, note_text, created_at, is_deleted, edited_at, feedback_attachments(id, storage_path, mime_type, file_name))
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

  const { data: report } = await adminClient.from('feedback_reports').select('user_id, title, notion_page_id').eq('id', id).single()
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

  notionAppendTimelineRow(report.notion_page_id, new Date().toISOString(), timelineRowAssigned(assignedTo ? assignedName : null))
  notionUpdateFeedbackAssignee(report.notion_page_id, assignedName)

  logActivity(toAdminContext(auth.userId), {
    action: 'update', entityType: 'feedback', entityId: id, entityLabel: report.title || 'Sem título',
    detail: assignedTo ? `atribuiu a ${assignedName}` : 'removeu atribuição',
  })

  const title = report.title || 'Sem título'
  await notifyUser(report.user_id, {
    type: 'feedback_update',
    title: assignedTo ? `Seu chamado foi atribuído a ${assignedName}` : `Atribuição removida do seu chamado`,
    body: title,
    link: `/dashboard/feedback?tab=minhas&report=${id}`,
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

  const { data: report } = await adminClient.from('feedback_reports').select('user_id, title, status, notion_page_id').eq('id', id).single()
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

  notionAppendTimelineRow(report.notion_page_id, new Date().toISOString(), timelineRowStatusChanged(report.status as FeedbackStatus, status))
  notionUpdateFeedbackStatus(report.notion_page_id, status)

  logActivity(toAdminContext(auth.userId), {
    action: 'toggle', entityType: 'feedback', entityId: id, entityLabel: report.title || 'Sem título',
    detail: `status: ${STATUS_LABEL[report.status as FeedbackStatus]} → ${STATUS_LABEL[status]}`,
  })

  const title = report.title || 'Sem título'
  const link = `/dashboard/feedback?tab=minhas&report=${id}`
  await notifyUser(report.user_id, {
    type: 'feedback_update',
    title: `Chamado ${STATUS_LABEL[status].toLowerCase()}: ${title}`,
    body: `Status alterado de "${STATUS_LABEL[report.status as FeedbackStatus]}" para "${STATUS_LABEL[status]}".`,
    link,
  })

  // E-mail nas 2 transições de status que o membro pode receber depois da
  // abertura (que já manda o dela própria em submitFeedback/rdFeedbackOpened).
  if (status === 'in_progress' || status === 'resolved') {
    const contact = await getMemberEmailAndName(report.user_id)
    if (contact) {
      if (status === 'in_progress') rdFeedbackInProgress(contact.email, contact.name, title, link)
      else rdFeedbackResolved(contact.email, contact.name, title, link)
    }
  }

  revalidatePath('/admin/feedback')
  revalidatePath('/dashboard/feedback')
  return { success: true }
}

// Lembrete manual pro membro responder — não é uma resposta de verdade (não
// entra em feedback_events, senão apareceria misturado na timeline como se
// fosse uma mensagem). Usa o mesmo type 'feedback_update' que já tem
// som/toast em tempo real do lado do membro (feedback-notification-sound.tsx)
// — um type novo aqui ficaria mudo, sem disparar o alerta que é o objetivo.
export async function notifyMemberToRespond(id: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const adminClient = createAdminClient()
  const { data: report } = await adminClient.from('feedback_reports').select('user_id, title').eq('id', id).single()
  if (!report) return { error: 'Chamado não encontrado.' }

  const title = report.title || 'Sem título'
  await notifyUser(report.user_id, {
    type: 'feedback_update',
    title: `Estamos aguardando sua resposta: ${title}`,
    body: 'A equipe de suporte está esperando você responder este chamado.',
    link: `/dashboard/feedback?tab=minhas&report=${id}`,
  })

  logActivity(toAdminContext(auth.userId), {
    action: 'toggle', entityType: 'feedback', entityId: id, entityLabel: title, detail: 'notificou o membro para responder',
  })

  return { success: true }
}

// Chamado tanto pelo admin (responder um chamado) quanto pelo membro (responder
// no próprio chamado) — por isso a autorização checa os dois casos, e a
// notificação vai para "quem não escreveu": admin escreveu -> avisa o membro
// dono; membro escreveu -> avisa o responsável (ou todos os admins, se ninguém
// foi atribuído ainda).
export async function addFeedbackNote(
  id: string,
  note: string,
  attachments: { path: string; mimeType: string; sizeBytes: number; fileName?: string }[] = [],
) {
  const sanitized = sanitizeRichText(note)
  const preview = stripHtml(sanitized)
  if (!hasContent(sanitized)) return { error: 'Escreva algo antes de salvar.' }

  const supabase = await createClient()
  const { data: { user: actor } } = await supabase.auth.getUser()
  if (!actor) return { error: 'Não autenticado.' }

  const adminClient = createAdminClient()

  const { data: report } = await adminClient.from('feedback_reports').select('user_id, title, assigned_to, notion_page_id').eq('id', id).single()
  if (!report) return { error: 'Chamado não encontrado.' }

  const { data: actorProfile } = await adminClient.from('profiles').select('full_name, role').eq('id', actor.id).single()
  const isAdminActor = actorProfile?.role === 'admin'

  if (!isAdminActor && actor.id !== report.user_id) {
    return { error: 'Você não tem permissão para responder este chamado.' }
  }

  const { data: event } = await adminClient.from('feedback_events').insert({
    feedback_id: id,
    event_type: 'note_added',
    actor_name: actorProfile?.full_name ?? '',
    note_text: sanitized,
  }).select('id').single()

  if (attachments.length > 0 && event) {
    await adminClient.from('feedback_attachments').insert(
      attachments.map((a) => ({
        feedback_id: id,
        event_id: event.id,
        storage_path: a.path,
        mime_type: a.mimeType,
        size_bytes: a.sizeBytes,
        file_name: a.fileName || '',
      }))
    )
  }

  notionAppendTimelineRow(report.notion_page_id, new Date().toISOString(), timelineRowNote(actorProfile?.full_name ?? '', preview))

  // Só loga em admin_activity_log quando quem respondeu é admin — resposta do
  // próprio membro no seu chamado não é "atividade administrativa" (já fica
  // registrada em feedback_events, que cobre a timeline de ambos os lados).
  if (isAdminActor) {
    logActivity(toAdminContext(actor.id), {
      action: 'update', entityType: 'feedback', entityId: id, entityLabel: report.title || 'Sem título', detail: 'respondeu',
    })
  }

  const title = report.title || 'Sem título'
  const body = preview.slice(0, 140) || '📎 Enviou uma imagem'

  if (isAdminActor) {
    await notifyUser(report.user_id, {
      type: 'feedback_update',
      title: `Nova resposta no seu chamado: ${title}`,
      body,
      link: `/dashboard/feedback?tab=minhas&report=${id}`,
    })
  } else if (report.assigned_to) {
    await notifyUser(report.assigned_to, {
      type: 'feedback_update',
      title: `Nova resposta no chamado: ${title}`,
      body,
      link: `/admin/feedback?report=${id}`,
    })
  } else {
    await notifyAllAdmins(actor.id, {
      type: 'feedback_update',
      title: `Nova resposta no chamado: ${title}`,
      body,
      link: `/admin/feedback?report=${id}`,
    })
  }

  revalidatePath('/admin/feedback')
  revalidatePath('/dashboard/feedback')
  return { success: true }
}

// Admin exclui uma mensagem (resposta) da timeline — do responsável ou do
// próprio membro. Soft delete: `note_text`/anexos continuam no banco, só
// escondidos pelo `is_deleted`; a linha do evento fica, então a timeline não
// perde a marcação de "quando" a mensagem existiu. Sem mirror no Notion
// (a timeline lá é só um espelho de alto nível, editar uma linha específica
// não tem suporte no client de hoje — fora de escopo).
export async function deleteFeedbackNote(eventId: string, reportId: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const adminClient = createAdminClient()
  const { data: event } = await adminClient.from('feedback_events').select('event_type, feedback_id').eq('id', eventId).single()
  if (!event || event.feedback_id !== reportId || event.event_type !== 'note_added') {
    return { error: 'Mensagem não encontrada.' }
  }

  const { error } = await adminClient.from('feedback_events').update({ is_deleted: true }).eq('id', eventId)
  if (error) return { error: error.message }

  const { data: report } = await adminClient.from('feedback_reports').select('title').eq('id', reportId).single()
  logActivity(toAdminContext(auth.userId), {
    action: 'delete', entityType: 'feedback', entityId: reportId, entityLabel: report?.title || 'Sem título', detail: 'excluiu uma mensagem do chamado',
  })

  revalidatePath('/admin/feedback')
  revalidatePath('/dashboard/feedback')
  return { success: true }
}

// Admin edita o texto de uma mensagem já enviada — sobrescreve `note_text` e
// marca `edited_at` (exibido como "(editada)" na timeline pros dois lados).
export async function editFeedbackNote(eventId: string, reportId: string, newNote: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }

  const sanitized = sanitizeRichText(newNote)
  if (!hasContent(sanitized)) return { error: 'Escreva algo antes de salvar.' }

  const adminClient = createAdminClient()
  const { data: event } = await adminClient.from('feedback_events').select('event_type, feedback_id, is_deleted').eq('id', eventId).single()
  if (!event || event.feedback_id !== reportId || event.event_type !== 'note_added') {
    return { error: 'Mensagem não encontrada.' }
  }
  if (event.is_deleted) return { error: 'Não é possível editar uma mensagem excluída.' }

  const { error } = await adminClient
    .from('feedback_events')
    .update({ note_text: sanitized, edited_at: new Date().toISOString() })
    .eq('id', eventId)
  if (error) return { error: error.message }

  const { data: report } = await adminClient.from('feedback_reports').select('title').eq('id', reportId).single()
  logActivity(toAdminContext(auth.userId), {
    action: 'update', entityType: 'feedback', entityId: reportId, entityLabel: report?.title || 'Sem título', detail: 'editou uma mensagem do chamado',
  })

  revalidatePath('/admin/feedback')
  revalidatePath('/dashboard/feedback')
  return { success: true }
}
