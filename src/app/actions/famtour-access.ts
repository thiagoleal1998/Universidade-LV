'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity-log'
import { notifyAccessReviewers, notifyUser } from '@/app/actions/notifications'
import { requireAccessReviewer } from '@/lib/authz'
import { rdFamtourAccessRequested } from '@/lib/rdstation'
import type { AccessRequestStatus } from '@/lib/access-lock'

// Contexto de acesso do MEMBRO logado — UF do próprio perfil + status de
// solicitação (se houver) pra cada famtour que já pediu acesso. Espelha
// getMyTrainingAccessContext (src/app/actions/training-access.ts).
export async function getMyFamtourAccessContext(): Promise<{
  uf: string | null
  requestsByFamtourId: Record<string, AccessRequestStatus>
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { uf: null, requestsByFamtourId: {} }

  const adminClient = createAdminClient()
  const [{ data: profile }, { data: requests }] = await Promise.all([
    adminClient.from('profiles').select('uf').eq('id', user.id).single(),
    adminClient.from('famtour_access_requests').select('famtour_id, status').eq('member_id', user.id),
  ])

  const requestsByFamtourId: Record<string, AccessRequestStatus> = {}
  for (const r of requests ?? []) {
    requestsByFamtourId[r.famtour_id] = r.status as AccessRequestStatus
  }

  return { uf: profile?.uf || null, requestsByFamtourId }
}

export async function requestFamtourAccess(famtourId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const adminClient = createAdminClient()
  const { data: famtour } = await adminClient.from('famtours').select('title').eq('id', famtourId).single()
  if (!famtour) return { error: 'Famtour não encontrado.' }

  // Upsert: reenvio depois de uma negativa reseta pra 'pending' na MESMA
  // linha (UNIQUE famtour_id+member_id), sem guardar histórico de N
  // tentativas — o histórico de verdade fica em admin_activity_log.
  const { error } = await adminClient
    .from('famtour_access_requests')
    .upsert(
      { famtour_id: famtourId, member_id: user.id, status: 'pending', requested_at: new Date().toISOString(), resolved_at: null, resolved_by: null },
      { onConflict: 'famtour_id,member_id' }
    )
  if (error) return { error: error.message }

  const { data: profile } = await adminClient.from('profiles').select('full_name, company, uf').eq('id', user.id).single()
  const requesterName = profile?.full_name || 'Uma agência'
  const requesterInfo = [profile?.company, profile?.uf].filter(Boolean).join(' — ')

  const { recipientIds } = await notifyAccessReviewers(user.id, {
    type: 'famtour_access_requested',
    title: `${requesterName} solicitou acesso a um famtour exclusivo`,
    body: requesterInfo ? `"${famtour.title}" — ${requesterInfo}` : `"${famtour.title}"`,
    link: '/admin/marketing',
  })

  // E-mail além do sino — mesmo padrão de requestTrainingAccess.
  if (recipientIds.length > 0) {
    const idSet = new Set(recipientIds)
    const { data: usersData } = await adminClient.auth.admin.listUsers()
    const emails = (usersData?.users ?? [])
      .filter((u) => idSet.has(u.id) && u.email)
      .map((u) => u.email!)
    rdFamtourAccessRequested(emails, requesterName, famtour.title, `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://universidadelv.com.br'}/admin/marketing`)
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function resolveFamtourAccessRequest(requestId: string, famtourId: string, approve: boolean) {
  const ctx = await requireAccessReviewer()
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: request } = await adminClient
    .from('famtour_access_requests')
    .select('member_id, status, famtour_id')
    .eq('id', requestId)
    .single()
  if (!request) return { error: 'Solicitação não encontrada.' }
  if (request.famtour_id !== famtourId) return { error: 'Solicitação não pertence a este famtour.' }

  const { data: famtour } = await adminClient.from('famtours').select('title').eq('id', famtourId).single()
  const { data: member } = await adminClient.from('profiles').select('full_name').eq('id', request.member_id).single()

  const { error } = await adminClient
    .from('famtour_access_requests')
    .update({
      status: approve ? 'approved' : 'denied',
      resolved_at: new Date().toISOString(),
      resolved_by: ctx.userId,
    })
    .eq('id', requestId)
  if (error) return { error: error.message }

  logActivity(ctx, {
    action: 'toggle',
    entityType: 'solicitacao_famtour',
    entityId: requestId,
    entityLabel: `${member?.full_name || 'Agência'} — ${famtour?.title || famtourId}`,
    detail: approve ? 'aprovou solicitação de acesso' : 'negou solicitação de acesso',
  })

  notifyUser(request.member_id, {
    type: approve ? 'famtour_access_approved' : 'famtour_access_denied',
    title: approve ? 'Acesso liberado a um famtour' : 'Solicitação de acesso negada',
    body: famtour?.title ? `"${famtour.title}"` : '',
    link: '/dashboard',
  })

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}
