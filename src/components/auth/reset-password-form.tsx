'use client'

import { useActionState, useEffect, useState } from 'react'
import { resetPassword } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import type { Settings } from '@/lib/settings'
import { AuthShell } from '@/components/auth/auth-shell'

type State = { error?: string } | undefined
type SessionState = 'loading' | 'ready' | 'invalid'

export function ResetPasswordForm({ settings, messages }: { settings: Settings; messages: string[] }) {
  const [state, action, pending] = useActionState<State, FormData>(resetPassword, undefined)
  const [sessionState, setSessionState] = useState<SessionState>('loading')

  useEffect(() => {
    // O link de recuperação agora é gerado no servidor (adminClient.auth.admin
    // .generateLink, enviado por e-mail via RD Station) — não pelo próprio
    // navegador que vai consumi-lo. Isso significa que o Supabase NÃO consegue
    // emitir um link no formato PKCE (?code=...), porque PKCE exige um
    // code_verifier local que só existe quando é o PRÓPRIO navegador do
    // usuário quem inicia o pedido. O link vem como #access_token=...&refresh_
    // token=... (fragmento, implícito) — precisa ser lido aqui no cliente e
    // virar sessão via setSession() ANTES da Server Action (que depende do
    // cookie de sessão) conseguir trocar a senha.
    const hash = window.location.hash
    const params = new URLSearchParams(hash.slice(1))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (!access_token || !refresh_token) {
      setSessionState('invalid')
      return
    }

    const supabase = createClient()
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      window.history.replaceState(null, '', window.location.pathname)
      setSessionState(error ? 'invalid' : 'ready')
    })
  }, [])

  return (
    <AuthShell settings={settings} messages={messages}>
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Criar nova senha</h2>
          <p className="text-muted-foreground text-sm mt-1.5">
            Escolha uma senha segura para sua conta.
          </p>
        </div>

        {sessionState === 'loading' && (
          <div className="flex items-center justify-center py-8">
            <Spinner className="w-6 h-6" />
          </div>
        )}

        {sessionState === 'invalid' && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
            Link inválido ou expirado. Solicite uma nova redefinição de senha.
          </p>
        )}

        {sessionState === 'ready' && (
          <form action={action} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            {state?.error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                {state.error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Spinner className="w-5 h-5" /> : 'Salvar nova senha'}
            </Button>
          </form>
        )}
      </div>
    </AuthShell>
  )
}
