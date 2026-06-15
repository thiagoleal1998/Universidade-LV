'use client'

import { useActionState, useEffect } from 'react'
import Link from 'next/link'
import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import type { Settings } from '@/lib/settings'
import { AuthShell } from '@/components/auth/auth-shell'

type LoginState = { error?: string; redirectTo?: string } | undefined

export function LoginForm({ settings, messages }: { settings: Settings; messages: string[] }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined)

  useEffect(() => {
    if (state?.redirectTo) window.location.href = state.redirectTo
  }, [state])

  return (
    <AuthShell settings={settings} messages={messages}>
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">{settings.login_heading}</h2>
          {settings.login_subheading && (
            <p className="text-muted-foreground text-sm mt-1.5">{settings.login_subheading}</p>
          )}
        </div>

        <form action={action} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="seu@email.com" required autoComplete="email" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="password">Senha</Label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Esqueci minha senha
              </Link>
            </div>
            <Input id="password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password" />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
              {state.error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending || !!state?.redirectTo}>
            {(pending || state?.redirectTo) ? <Spinner className="w-5 h-5" /> : 'Entrar'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-border text-center">
          <Link href="/register" className="text-sm text-primary hover:underline font-medium">
            {settings.login_register_text}
          </Link>
        </div>
      </div>
    </AuthShell>
  )
}
