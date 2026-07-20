'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { emailMembersNewAnnouncement } from '@/lib/email'
import { getSettings } from '@/lib/settings'
import { notifyAllMembers } from '@/app/actions/notifications'
import { requireAdmin, requireAnyRole } from '@/lib/authz'
import { logActivity, diffFields } from '@/lib/activity-log'

// O corpo do comunicado é HTML (editor rico) — a notificação mostra o body
// como texto puro, então precisa remover as tags antes de truncar, senão
// aparece "<strong>...</strong>" literal na tela do membro.
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
}

// E-mail + notificação in-app pra todos os membros ativos — disparado tanto
// quando o admin publica via toggle quanto quando o colaborador cria já
// publicado (createAnnouncement). Fire-and-forget, igual já era.
async function notifyNewAnnouncement(ann: { title: string; body: string }) {
  const adminClient = createAdminClient()
  const [{ data: profiles }, { data: usersData }, settings] = await Promise.all([
    adminClient.from('profiles').select('id').eq('role', 'member').eq('active', true),
    adminClient.auth.admin.listUsers(),
    getSettings(),
  ])
  const activeIds = new Set((profiles ?? []).map((p) => p.id))
  const emails = (usersData?.users ?? [])
    .filter((u) => activeIds.has(u.id) && u.email)
    .map((u) => u.email!)
  emailMembersNewAnnouncement(emails, ann.title, ann.body, settings.site_name)

  notifyAllMembers({
    type: 'announcement',
    title: `Novo comunicado: ${ann.title}`,
    body: stripHtml(ann.body ?? '').substring(0, 120),
    link: '/dashboard',
  })
}

// Qualquer colaborador ativo pode criar/publicar um comunicado (privilégio de
// papel, não de área/capacidade) — só admin edita, exclui ou despublica
// depois (ver updateAnnouncement/deleteAnnouncement/toggleAnnouncementPublished).
// Usa adminClient (não createClient): a RLS de announcements é admin-only
// estrita, e a mutação do colaborador precisa do bypass, igual ao padrão já
// usado em courses.ts/modules.ts/etc.
export async function createAnnouncement(formData: FormData) {
  const authz = await requireAnyRole()
  if ('error' in authz) return { error: authz.error }

  const supabase = createAdminClient()
  const title = formData.get('title') as string
  const body = formData.get('body') as string
  const publish_at_raw = (formData.get('publish_at') as string) || null
  const publish_at = publish_at_raw ? new Date(publish_at_raw).toISOString() : null
  const expires_at_raw = (formData.get('expires_at') as string) || null
  const expires_at = expires_at_raw ? new Date(expires_at_raw).toISOString() : null

  // Admin cria como rascunho (fluxo de revisão manual, igual sempre foi).
  // Colaborador "publica" de verdade — sem agendamento, vai ao ar na hora;
  // com agendamento, respeita a data (mesmo comportamento de scheduleAnnouncement).
  const is_published = authz.role !== 'admin' && !publish_at

  const { data, error } = await supabase
    .from('announcements')
    .insert({ title, body, publish_at, expires_at, is_published })
    .select()
    .single()

  if (error) return { error: error.message }
  logActivity(authz, { action: 'create', entityType: 'comunicado', entityId: data?.id, entityLabel: title })

  if (is_published && data) notifyNewAnnouncement({ title, body })

  revalidatePath('/admin/comunicados')
  revalidatePath('/dashboard', 'layout')
  return { data }
}

export async function updateAnnouncement(id: string, formData: FormData) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()
  const title = formData.get('title') as string
  const body = formData.get('body') as string
  const is_published = formData.get('is_published') === 'true'
  const publish_at_raw = (formData.get('publish_at') as string) || null
  const publish_at = publish_at_raw ? new Date(publish_at_raw).toISOString() : null
  const expires_at_raw = (formData.get('expires_at') as string) || null
  const expires_at = expires_at_raw ? new Date(expires_at_raw).toISOString() : null

  const { data: prev } = await supabase
    .from('announcements')
    .select('title, body, is_published, publish_at, expires_at')
    .eq('id', id)
    .single()

  const after = { title, body, is_published, publish_at, expires_at }
  const { error } = await supabase
    .from('announcements')
    .update({ ...after, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  const changed = diffFields(prev ?? {}, after, {
    title: 'título', body: 'texto', is_published: 'publicação', publish_at: 'agendamento', expires_at: 'expiração',
  })
  if (changed.length > 0) {
    logActivity(authz, { action: 'update', entityType: 'comunicado', entityId: id, entityLabel: title, detail: `alterou: ${changed.join(', ')}` })
  }

  revalidatePath('/admin/comunicados')
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function deleteAnnouncement(id: string) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()
  const { data: ann } = await supabase.from('announcements').select('title').eq('id', id).single()
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) return { error: error.message }
  logActivity(authz, { action: 'delete', entityType: 'comunicado', entityId: id, entityLabel: ann?.title ?? id })
  revalidatePath('/admin/comunicados')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleAnnouncementPublished(id: string, is_published: boolean) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()

  const { data: ann, error } = await supabase
    .from('announcements')
    .update({ is_published, publish_at: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('title, body')
    .single()

  if (error) return { error: error.message }

  logActivity(authz, { action: 'toggle', entityType: 'comunicado', entityId: id, entityLabel: ann?.title ?? id, detail: is_published ? 'publicou' : 'despublicou' })

  if (is_published && ann) notifyNewAnnouncement(ann)

  revalidatePath('/admin/comunicados')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function scheduleAnnouncement(id: string, publish_at: string) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()
  const { data: ann } = await supabase.from('announcements').select('title').eq('id', id).single()

  const { error } = await supabase
    .from('announcements')
    .update({
      publish_at: new Date(publish_at).toISOString(),
      is_published: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }
  logActivity(authz, { action: 'update', entityType: 'comunicado', entityId: id, entityLabel: ann?.title ?? id, detail: `agendou para ${new Date(publish_at).toLocaleString('pt-BR')}` })
  revalidatePath('/admin/comunicados')
  revalidatePath('/dashboard')
  return { success: true }
}
