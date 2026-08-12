'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { rdWelcomeOnRegister, rdAdminNewMemberPending, rdPasswordReset } from '@/lib/rdstation'
import { notifyAllAdmins } from '@/app/actions/notifications'
import { verifyTurnstile } from '@/lib/turnstile'
import { UF_NAMES } from '@/lib/estado-flag'

const CAPTCHA_ERROR = 'Não foi possível verificar que você não é um robô. Recarregue a página e tente novamente.'

export async function login(_state: unknown, formData: FormData) {
  const captchaOk = await verifyTurnstile(formData.get('captcha_token') as string | null, 'login')
  if (!captchaOk) return { error: CAPTCHA_ERROR }

  // allowSessionClear: o login desloga de propósito quando a conta ainda não
  // foi aprovada (signOut logo abaixo) — ver server.ts.
  const supabase = await createClient({ allowSessionClear: true })

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Email ou senha incorretos.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Erro ao autenticar.' }

  // Usa adminClient para leitura do perfil pós-login — RLS não deve bloquear operação server-side de autenticação
  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role, active')
    .eq('id', user.id)
    .single()

  if (!profile?.active) {
    await supabase.auth.signOut()
    return { info: 'Sua conta foi criada com sucesso e está aguardando aprovação. Assim que o acesso for liberado, você poderá entrar no seu ambiente de estudos e oportunidades.' }
  }

  return { redirectTo: profile.role === 'admin' || profile.role === 'collaborator' ? '/admin' : '/dashboard' }
}

export async function logout() {
  // allowSessionClear: aqui o apagar-sessão é intencional (ver server.ts).
  const supabase = await createClient({ allowSessionClear: true })
  await supabase.auth.signOut()
  redirect('/login')
}

export async function forgotPassword(_state: unknown, formData: FormData) {
  const captchaOk = await verifyTurnstile(formData.get('captcha_token') as string | null, 'forgot_password')
  if (!captchaOk) return { error: CAPTCHA_ERROR }

  const email = (formData.get('email') as string)?.trim()

  // Nunca usar o origin da própria requisição aqui (`headers().get('host')`
  // ou `new URL(request.url)`) — atrás do proxy reverso da VPS isso pode
  // refletir o endereço INTERNO em vez do domínio público (mesmo gotcha real
  // já corrigido em src/app/auth/callback/route.ts).
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://universidadelv.com.br'

  // generateLink (service role) NÃO envia e-mail nenhum sozinho — só devolve
  // o link. É o que substitui o auth.resetPasswordForEmail (que ia direto
  // pelo SMTP do Supabase); o e-mail de verdade agora sai pela RD Station.
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/auth/callback?next=/reset-password` },
  })

  // Nunca revela se o e-mail existe ou não — resposta é sempre a mesma pro
  // cliente (mesma garantia que o resetPasswordForEmail original já dava);
  // o evento só dispara de fato quando o e-mail corresponde a uma conta.
  if (!error && data.properties?.action_link) {
    const { data: profile } = await adminClient.from('profiles').select('full_name').eq('id', data.user.id).single()

    // A URL de recuperação do Supabase é enorme — a RD Station não aceita
    // variável no destino de um link (só texto simples concatenado no corpo),
    // então o link apareceria por inteiro, gigante, no corpo do e-mail. Em vez
    // disso, gera um código curto (`short_links`) que redireciona (src/app/r/
    // [code]/route.ts) pro link real do Supabase — é isso que vai no e-mail.
    const code = crypto.randomUUID().replace(/-/g, '').slice(0, 10)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    await adminClient.from('short_links').insert({ code, target_url: data.properties.action_link, expires_at: expiresAt })

    rdPasswordReset(email, profile?.full_name ?? '', `${siteUrl}/r/${code}`)
  }

  return { success: true }
}

export async function resetPassword(_state: unknown, formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: 'Não foi possível redefinir a senha. O link pode ter expirado.' }

  redirect('/login?reset=1')
}

export async function register(_state: unknown, formData: FormData) {
  const captchaOk = await verifyTurnstile(formData.get('captcha_token') as string | null, 'register')
  if (!captchaOk) return { error: CAPTCHA_ERROR }

  const full_name = (formData.get('full_name') as string).trim()
  const email = (formData.get('email') as string).trim()
  const password = formData.get('password') as string
  const uf = ((formData.get('uf') as string) || '').trim().toUpperCase()
  const city = ((formData.get('city') as string) || '').trim()

  if (!uf || !UF_NAMES[uf]) return { error: 'Selecione um estado (UF) válido.' }
  if (!city) return { error: 'Informe sua cidade.' }

  const adminClient = createAdminClient()

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already been registered')) {
      return { error: 'Este email já está cadastrado.' }
    }
    return { error: 'Não foi possível criar a conta. Tente novamente.' }
  }

  // Deixa conta inativa até o admin aprovar
  if (data.user) {
    await adminClient.from('profiles').update({ active: false, full_name, uf, city }).eq('id', data.user.id)
    rdAdminNewMemberPending(full_name, email)
    rdWelcomeOnRegister(email, full_name)
    await notifyAllAdmins(data.user.id, {
      type: 'new_member_pending',
      title: `Novo cadastro pendente: ${full_name || email}`,
      body: `${email} acabou de se cadastrar e está aguardando aprovação.`,
      link: '/admin/membros',
    })
  }

  return { success: true }
}
