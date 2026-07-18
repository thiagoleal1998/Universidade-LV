'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import type { Settings } from '@/lib/settings'
import { AuthShell } from '@/components/auth/auth-shell'
import { Eye, EyeOff } from 'lucide-react'

type LoginState = { error?: string; info?: string; redirectTo?: string } | undefined

export function LoginForm({ settings, messages, reason }: { settings: Settings; messages: string[]; reason?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (state?.redirectTo) window.location.href = state.redirectTo
  }, [state])

  useEffect(() => {
    if (reason !== 'idle') return
    // setTimeout empurra pra depois do efeito de subscribe do <Toaster/> (root
    // layout) — chamado no mesmo commit do mount, toast() aqui perderia o
    // toast porque ToastState.subscribe não faz replay de eventos anteriores.
    const t = setTimeout(() => toast.info('Você foi desconectado por inatividade.'), 0)
    return () => clearTimeout(t)
  }, [reason])

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
            <div className="relative">
              <Input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" required autoComplete="current-password" className="pr-10" />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {state?.error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
              {state.error}
            </p>
          )}

          {state?.info && (
            <p className="text-sm text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2.5">
              {state.info}
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
