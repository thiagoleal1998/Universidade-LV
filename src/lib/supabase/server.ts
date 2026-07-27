import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Cliente Supabase com a sessão do usuário (respeita RLS).
 *
 * `allowSessionClear` (padrão: false) — quando false, escritas de cookie de
 * sessão com valor VAZIO são ignoradas. O `@supabase/ssr` faz esse tipo de
 * escrita para "apagar a sessão" sempre que uma renovação de token falha —
 * inclusive quando ela falha apenas porque outra requisição concorrente já
 * renovou (o Supabase ROTACIONA o refresh_token, então a tentativa seguinte
 * chega com um token já consumido). Numa tela que dispara várias Server
 * Actions em sequência (`EditMemberDialog`) somadas ao heartbeat de presença,
 * isso deslogava o usuário no meio de um salvamento: nos logs o cookie de
 * sessão passava a chegar com `len=0` e as actions seguintes respondiam
 * "Apenas admins podem fazer isso" (bug real, v1.102.6).
 *
 * Ignorar a limpeza é seguro: o cookie anterior continua válido e a próxima
 * requisição renova normalmente. Logout de verdade (`src/app/actions/auth.ts`)
 * passa `allowSessionClear: true` e continua apagando a sessão como antes.
 */
export async function createClient(options?: { allowSessionClear?: boolean }) {
  const cookieStore = await cookies()
  const allowSessionClear = options?.allowSessionClear ?? false

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options: cookieOptions } of cookiesToSet) {
              if (!allowSessionClear && name.startsWith('sb-') && value === '') continue
              cookieStore.set(name, value, cookieOptions)
            }
          } catch {}
        },
      },
    }
  )
}
