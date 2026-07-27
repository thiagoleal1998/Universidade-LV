import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Resolve o usuário logado a partir da requisição atual, com uma rede de
 * segurança.
 *
 * Caminho normal: `supabase.auth.getUser()` do client de cookies.
 *
 * Fallback: em certas requisições de Server Action, esse client responde
 * `AuthSessionMissingError` mesmo com o cookie de sessão presente e íntegro —
 * confirmado em produção por diagnóstico: cookie de 2619 bytes, `expires_at`
 * no futuro (`venceu=false`), com `refresh_token` e com o `user` correto, e
 * ainda assim "Auth session missing". Quando isso acontece, lemos o
 * `access_token` direto do cookie e o validamos no servidor de auth.
 *
 * Isso NÃO enfraquece a segurança: `auth.getUser(token)` verifica a assinatura
 * e a validade do JWT no próprio Supabase — é a mesma checagem que o caminho
 * normal faria. Um token forjado/expirado continua sendo recusado; a única
 * diferença é de onde o token foi lido.
 *
 * Sintoma que isso corrige: admin salvando o próprio perfil recebia
 * "Apenas admins podem fazer isso" (bug real, v1.102.10).
 */
export async function getSessionUser(): Promise<{ id: string; email?: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return { id: user.id, email: user.email }

  try {
    const jar = await cookies()
    const authCookie = jar.getAll().find(
      (c) => c.name.startsWith('sb-') && c.name.includes('auth-token') && c.value.length > 0
    )
    if (!authCookie) return null

    const raw = authCookie.value.startsWith('base64-') ? authCookie.value.slice(7) : authCookie.value
    const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
    const accessToken: unknown = parsed?.access_token
    if (typeof accessToken !== 'string' || !accessToken) return null

    const { data, error } = await createAdminClient().auth.getUser(accessToken)
    if (error || !data.user) return null
    return { id: data.user.id, email: data.user.email }
  } catch {
    return null
  }
}
