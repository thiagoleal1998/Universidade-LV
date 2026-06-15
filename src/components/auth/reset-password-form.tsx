'use client'

import { useActionState } from 'react'
import { resetPassword } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import type { Settings } from '@/lib/settings'
import { AuthShell } from '@/components/auth/auth-shell'

type State = { error?: string } | undefined

export function ResetPasswordForm({ settings, messages }: { settings: Settings; messages: string[] }) {
  const [state, action, pending] = useActionState<State, FormData>(resetPassword, undefined)

  return (
    <AuthShell settings={settings} messages={messages}>
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Criar nova senha</h2>
          <p className="text-muted-foreground text-sm mt-1.5">
            Escolha uma senha segura para sua conta.
          </p>
        </div>

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
      </div>
    </AuthShell>
  )
}
