'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Heartbeat de presença: grava/acumula a PRÓPRIA linha em profiles
// (last_seen_at + total_time_seconds) via function atômica no Postgres —
// ver record_presence_heartbeat na migração 037. Sem guard de role: cada
// usuário só pode marcar a si mesmo como online (.eq/p_user_id = user.id).
export async function recordHeartbeat() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const adminClient = createAdminClient()
  const { error } = await adminClient.rpc('record_presence_heartbeat', { p_user_id: user.id })
  if (error) return { error: error.message }

  return { success: true }
}
