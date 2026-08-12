'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity-log'
import { notifyTrainingAccessReviewers, notifyUser } from '@/app/actions/notifications'
import { requireTrainingAccess } from '@/app/actions/training'
import { rdTrainingAccessRequested } from '@/lib/rdstation'
import type { AccessRequestStatus } from '@/lib/training-access'

// Contexto de acesso do MEMBRO logado — UF do próprio perfil + status de
// solicitação (se houver) pra cada treinamento que já pediu acesso. Usado
// pelas 3 telas de exibição (lista, detalhe, widget da home) pra decidir se
// mostra o CTA normal ou o selo "Exclusivo" + botão de solicitar.
export async function getMyTrainingAccessContext(): Promise<{
  uf: string | null
  requestsByTrainingId: Record<string, AccessRequestStatus>
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { uf: null, requestsByTrainingId: {} }

  const adminClient = createAdminClient()
  const [{ data: profile }, { data: requests }] = await Promise.all([
    adminClient.from('profiles').select('uf').eq('id', user.id).single(),
    adminClient.from('training_access_requests').select('training_id, status').eq('member_id', user.id),
  ])

  const requestsByTrainingId: Record<string, AccessRequestStatus> = {}
  for (const r of requests ?? []) {
    requestsByTrainingId[r.training_id] = r.status as AccessRequestStatus
  }

  return { uf: profile?.uf || null, requestsByTrainingId }
}

export async function requestTrainingAccess(trainingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const adminClient = createAdminClient()
  const { data: training } = await adminClient.from('training_items').select('title').eq('id', trainingId).single()
  if (!training) return { error: 'Treinamento não encontrado.' }

  // Upsert: reenvio depois de uma negativa reseta pra 'pending' na MESMA
  // linha (UNIQUE training_id+member_id), sem guardar histórico de N
  // tentativas — o histórico de verdade fica em admin_activity_log.
  const { error } = await adminClient
    .from('training_access_requests')
    .upsert(
      { training_id: trainingId, member_id: user.id, status: 'pending', requested_at: new Date().toISOString(), resolved_at: null, resolved_by: null },
      { onConflict: 'training_id,member_id' }
    )
  if (error) return { error: error.message }

  const { data: profile } = await adminClient.from('profiles').select('full_name, company, uf').eq('id', user.id).single()
  const requesterName = profile?.full_name || 'Uma agência'
  const requesterInfo = [profile?.company, profile?.uf].filter(Boolean).join(' — ')

  const { recipientIds } = await notifyTrainingAccessReviewers(user.id, {
    type: 'training_access_requested',
    title: `${requesterName} solicitou acesso a um treinamento exclusivo`,
    body: requesterInfo ? `"${training.title}" — ${requesterInfo}` : `"${training.title}"`,
    link: '/admin/marketing',
  })

  // E-mail além do sino — mesmo padrão de notifyMembers/rdNewTraining
  // (training.ts): busca os e-mails a partir dos IDs já resolvidos acima,
  // não recalcula quem são os destinatários de novo.
  if (recipientIds.length > 0) {
    const idSet = new Set(recipientIds)
    const { data: usersData } = await adminClient.auth.admin.listUsers()
    const emails = (usersData?.users ?? [])
      .filter((u) => idSet.has(u.id) && u.email)
      .map((u) => u.email!)
    rdTrainingAccessRequested(emails, requesterName, training.title, `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://universidadelv.com.br'}/admin/marketing`)
  }

  revalidatePath('/dashboard/treinamentos')
  revalidatePath(`/dashboard/treinamentos/${trainingId}`)
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function resolveTrainingAccessRequest(requestId: string, trainingId: string, approve: boolean) {
  const ctx = await requireTrainingAccess(trainingId)
  if ('error' in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  const { data: request } = await adminClient
    .from('training_access_requests')
    .select('member_id, status, training_id')
    .eq('id', requestId)
    .single()
  if (!request) return { error: 'Solicitação não encontrada.' }
  if (request.training_id !== trainingId) return { error: 'Solicitação não pertence a este treinamento.' }

  const { data: training } = await adminClient.from('training_items').select('title').eq('id', trainingId).single()
  const { data: member } = await adminClient.from('profiles').select('full_name').eq('id', request.member_id).single()

  const { error } = await adminClient
    .from('training_access_requests')
    .update({
      status: approve ? 'approved' : 'denied',
      resolved_at: new Date().toISOString(),
      resolved_by: ctx.userId,
    })
    .eq('id', requestId)
  if (error) return { error: error.message }

  logActivity(ctx, {
    action: 'toggle',
    entityType: 'solicitacao_treinamento',
    entityId: requestId,
    entityLabel: `${member?.full_name || 'Agência'} — ${training?.title || trainingId}`,
    detail: approve ? 'aprovou solicitação de acesso' : 'negou solicitação de acesso',
  })

  notifyUser(request.member_id, {
    type: approve ? 'training_access_approved' : 'training_access_denied',
    title: approve ? 'Acesso liberado a um treinamento' : 'Solicitação de acesso negada',
    body: training?.title ? `"${training.title}"` : '',
    link: `/dashboard/treinamentos/${trainingId}`,
  })

  revalidatePath('/admin/marketing')
  revalidatePath('/dashboard/treinamentos')
  revalidatePath(`/dashboard/treinamentos/${trainingId}`)
  return { success: true }
}
