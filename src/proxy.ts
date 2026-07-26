import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error: mwAuthError } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // DIAGNÓSTICO TEMPORÁRIO (v1.102.4): investigando logout no meio do save.
  // Remover assim que a causa for identificada.
  if (!user && pathname.startsWith('/admin')) {
    const sb = request.cookies.getAll().map((c) => c.name).filter((n) => n.startsWith('sb-'))
    console.error('[MW-DIAG]', request.method, pathname,
      '| erro:', mwAuthError?.message ?? '(nenhum)',
      '| status:', mwAuthError?.status ?? '-',
      '| cookies sb-:', sb.length ? sb.join(',') : 'NENHUM',
      '| next-action:', request.headers.get('next-action') ? 'sim' : 'nao')
  }

  // Server Action (POST com header `next-action`) NUNCA pode receber redirect
  // deste middleware. O cliente do Next espera o payload da action na resposta;
  // se vier um 307 pra outra rota, ele recebe HTML no lugar e derruba a aba
  // inteira ("This page couldn't load") em vez de mostrar um erro tratável.
  //
  // Bug real (v1.102.2): um diálogo que dispara várias actions em sequência
  // (EditMemberDialog) com o access_token perto de expirar causa disputa na
  // renovação — a primeira requisição rotaciona o refresh_token e as seguintes
  // chegam aqui com o token antigo, sem `user`. Nos logs: `POST 200` seguido
  // de `POST 307` no MESMO segundo. Só afetava sessão antiga (token precisando
  // renovar); em janela anônima, com login novo, nunca reproduzia.
  //
  // Deixar passar é seguro: toda action de mutação tem guard próprio
  // (requireAdmin/requireCapability/...) e devolve `{ error }`, que o cliente
  // exibe como toast — a segurança não depende deste middleware.
  const isServerAction = request.method === 'POST' && request.headers.has('next-action')

  // Rotas públicas: acessíveis sem autenticação
  const isPublic =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname.startsWith('/auth/') ||
    // Callback OAuth2 da RD Station: recebido pelo navegador do admin logo após
    // autorizar o app na própria RD Station — não pode depender de sessão do
    // nosso app (a checagem de quem pode iniciar o fluxo já é manual/pontual).
    pathname.startsWith('/api/rdstation/')

  if (isPublic) {
    // Se já autenticado e tentar acessar login, redireciona para o painel.
    // A raiz "/" continua mostrando a landing page mesmo autenticado.
    if (user && pathname === '/login') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const redirectTo = profile?.role === 'admin' || profile?.role === 'collaborator' ? '/admin' : '/dashboard'
      return NextResponse.redirect(new URL(redirectTo, request.url))
    }
    return supabaseResponse
  }

  if (!user && !isServerAction) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, active')
      .eq('id', user.id)
      .single()

    // Colaborador entra no painel (as páginas filtram o que ele pode ver),
    // mas precisa estar ativo — admin não exige active (comportamento original).
    const allowed =
      profile?.role === 'admin' ||
      (profile?.role === 'collaborator' && profile.active)

    if (!allowed && !isServerAction) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  if (user && pathname.startsWith('/dashboard')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('active')
      .eq('id', user.id)
      .single()

    if ((!profile || !profile.active) && !isServerAction) {
      return NextResponse.redirect(new URL('/login?error=inactive', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
      // Prefetch do Next NÃO passa por aqui. O Next pré-carrega todo <Link>
      // visível, e cada passagem pelo middleware chama `supabase.auth.getUser()`
      // — que RENOVA o token quando ele está vencendo. Com dezenas de prefetches
      // disparando juntos, várias renovações concorriam pelo mesmo
      // refresh_token; o Supabase rotaciona esse token, então as retardatárias
      // chegavam com um token já consumido e a sessão inteira era invalidada.
      // Sintoma: o usuário era deslogado no meio de um salvamento e a action
      // respondia "Apenas admins podem fazer isso" (v1.102.3).
      //
      // Seguro: prefetch é só pré-carregamento, e cada página protegida tem
      // guard próprio (`requireAdminPage`/`requireContentPage`/…), que continua
      // valendo quando a rota é realmente aberta.
      missing: [{ type: 'header', key: 'next-router-prefetch' }],
    },
  ],
}
