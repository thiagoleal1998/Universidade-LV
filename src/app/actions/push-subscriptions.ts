'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type PushSubscriptionInput = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

// Guard aqui é só "autenticado" — qualquer papel (membro, colaborador, admin)
// pode inscrever o próprio navegador. Usa adminClient pra inserir (mesmo
// padrão do resto do projeto: a checagem de posse fica no filtro por
// user.id, não numa policy de RLS — push_subscriptions não tem nenhuma).
export async function subscribeToPush(sub: PushSubscriptionInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  }, { onConflict: 'endpoint' })

  if (error) return { error: error.message }
  return { success: true }
}

export async function unsubscribeFromPush(endpoint: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const adminClient = createAdminClient()
  await adminClient.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint)
  return { success: true }
}

// Usado no mount do prompt de inscrição, pra saber se ESTE navegador já tem
// uma inscrição salva no servidor (o browser sabe se tem permissão concedida,
// mas não sabe sozinho se o endpoint dele já está salvo no nosso banco).
export async function hasActivePushSubscription(endpoint: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)
    .maybeSingle()

  return !!data
}
