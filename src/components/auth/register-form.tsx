'use client'

import { useActionState, startTransition, useState } from 'react'
import Link from 'next/link'
import { register } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2 } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { Settings } from '@/lib/settings'
import { AuthShell } from '@/components/auth/auth-shell'
import { getTurnstileToken } from '@/lib/turnstile-client'
import { UF_NAMES } from '@/lib/estado-flag'
import { formatCnpj } from '@/lib/cnpj'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const UF_OPTIONS = Object.entries(UF_NAMES).sort((a, b) => a[1].localeCompare(b[1]))

type State = { error?: string; success?: boolean } | undefined

export function RegisterForm({ settings, messages }: { settings: Settings; messages: string[] }) {
  const [state, action, pending] = useActionState<State, FormData>(register, undefined)
  // Cobre a espera pelo token do Turnstile — ver mesmo comentário em
  // login-form.tsx (`pending` do useActionState não reflete essa fase).
  const [isVerifying, setIsVerifying] = useState(false)
  const [cnpjValue, setCnpjValue] = useState('')
  const [ufValue, setUfValue] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isVerifying || pending) return
    setIsVerifying(true)
    const formData = new FormData(e.currentTarget)
    formData.set('uf', ufValue)
    const token = await getTurnstileToken('register')
    formData.set('captcha_token', token ?? '')
    startTransition(() => { action(formData) })
    setIsVerifying(false)
  }

  return (
    <AuthShell settings={settings} messages={messages}>
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Criar minha conta</h2>
          <p className="text-muted-foreground text-sm mt-1.5">
            Preencha os dados abaixo para solicitar acesso à plataforma.
          </p>
        </div>

        {state?.success ? (
          <div className="flex flex-col items-center gap-5 py-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <div>
              <p className="font-semibold text-foreground">Cadastro realizado!</p>
              <p className="text-sm text-muted-foreground mt-1.5">
                Confira seu email para confirmar a conta. Após isso, aguarde a ativação pelo administrador.
              </p>
            </div>
            <Link href="/login" className="text-sm text-primary hover:underline">
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input id="full_name" name="full_name" type="text" placeholder="Seu nome completo" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="seu@email.com" required autoComplete="email" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company">Nome da Agência</Label>
              <Input id="company" name="company" type="text" placeholder="Nome da sua agência de viagens" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                name="cnpj"
                type="text"
                inputMode="numeric"
                placeholder="00.000.000/0000-00"
                required
                value={cnpjValue}
                onChange={(e) => setCnpjValue(formatCnpj(e.target.value))}
                maxLength={18}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="uf">Estado (UF)</Label>
                <Select value={ufValue} onValueChange={(v) => setUfValue(v ?? '')}>
                  <SelectTrigger id="uf" className="w-full">
                    <SelectValue>{(v: string) => v ? UF_NAMES[v] : 'Selecione'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {UF_OPTIONS.map(([sigla, nome]) => (
                      <SelectItem key={sigla} value={sigla}>{nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" name="city" type="text" placeholder="Sua cidade" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
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

            <Button type="submit" className="w-full" disabled={isVerifying || pending}>
              {isVerifying || pending ? <Spinner className="w-5 h-5" /> : 'Criar conta'}
            </Button>

            <div className="pt-2 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Entrar
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </AuthShell>
  )
}
