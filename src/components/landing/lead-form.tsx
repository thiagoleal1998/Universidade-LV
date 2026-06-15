'use client'

import { useState, useTransition } from 'react'
import { CheckCircle } from 'lucide-react'
import { submitLead } from '@/app/actions/leads'

export function LeadForm({
  title,
  subtitle,
  ctaText,
  successMessage,
}: {
  title: string
  subtitle: string
  ctaText: string
  successMessage: string
}) {
  const [state, setState] = useState<{ success?: boolean; error?: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await submitLead(formData)
      setState(result)
    })
  }

  return (
    <section id="contato" className="py-12 md:py-16 px-4 sm:px-6 bg-green-50 dark:bg-green-950/20">
      <div className="max-w-xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2.5">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">{subtitle}</p>
        )}

        {state?.success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <p className="font-semibold text-foreground">{successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3 text-left">
              <div>
                <label htmlFor="lead_name" className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Seu nome *
                </label>
                <input
                  id="lead_name"
                  name="name"
                  type="text"
                  required
                  placeholder="Maria Silva"
                  className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-shadow"
                />
              </div>
              <div>
                <label htmlFor="lead_email" className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Seu e-mail *
                </label>
                <input
                  id="lead_email"
                  name="email"
                  type="email"
                  required
                  placeholder="maria@agencia.com"
                  className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-shadow"
                />
              </div>
            </div>
            {state?.error && (
              <p className="text-xs text-red-500 text-left">{state.error}</p>
            )}
            <div className="pt-1">
              <button
                type="submit"
                disabled={pending}
                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold text-sm px-8 py-3 rounded-lg transition-colors min-h-[44px]"
              >
                {pending ? 'Enviando...' : ctaText}
              </button>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-2">
              Seus dados estão seguros. Não enviamos spam.
            </p>
          </form>
        )}
      </div>
    </section>
  )
}
