'use client'

import { useState, useEffect } from 'react'
import { X, BookOpen, Users, Search, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const ONBOARDING_KEY = 'onboarding_complete_v1'

const STEP_META = [
  { icon: BookOpen, color: 'bg-primary/10 text-primary' },
  { icon: Search,   color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
  { icon: Users,    color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' },
] as const

type StepData = { title: string; description: string }

const DEFAULT_STEPS: StepData[] = [
  { title: 'Seus cursos estão aqui', description: 'Acesse "Meus Cursos" no menu para ver todo o conteúdo disponível. Seu progresso é salvo automaticamente a cada aula concluída.' },
  { title: 'Encontre qualquer conteúdo', description: 'Use o item "Buscar" no menu ou pressione Ctrl+K em qualquer página para encontrar aulas e cursos instantaneamente.' },
  { title: 'Você não está sozinho', description: 'Acesse a Comunidade para tirar dúvidas, compartilhar conquistas e interagir com outros membros.' },
]

type Props = { userName?: string; stepsJson?: string }

export function OnboardingModal({ userName = '', stepsJson = '' }: Props) {
  const steps: StepData[] = (() => {
    try {
      const parsed = JSON.parse(stepsJson)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 3)
    } catch {}
    return DEFAULT_STEPS
  })()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_KEY)) setVisible(true)
  }, [])

  function finish() {
    localStorage.setItem(ONBOARDING_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  const currentStep = steps[step] ?? DEFAULT_STEPS[step]
  const meta = STEP_META[step] ?? STEP_META[0]
  const Icon = meta.icon
  const isLast = step === steps.length - 1
  const firstName = userName.split(' ')[0]

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">

        {/* Close */}
        <button
          onClick={finish}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10 p-1 rounded-md hover:bg-muted"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-7 pb-4">
          {/* Step dots */}
          <div className="flex gap-1.5 mb-7">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 rounded-full flex-1 transition-all duration-300',
                  i <= step ? 'bg-primary' : 'bg-border'
                )}
              />
            ))}
          </div>

          {/* Icon */}
          <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mb-5', meta.color)}>
            <Icon className="w-7 h-7" />
          </div>

          {/* Greeting on first step */}
          {step === 0 && firstName && (
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
              Bem-vindo, {firstName}!
            </p>
          )}

          <h2 className="text-xl font-bold text-foreground mb-2 leading-tight">{currentStep.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{currentStep.description}</p>
        </div>

        <div className="px-7 pb-7 pt-3 flex items-center justify-between">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Anterior
            </button>
          ) : (
            <button
              onClick={finish}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pular
            </button>
          )}

          <button
            onClick={() => isLast ? finish() : setStep((s) => s + 1)}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-5 py-2 rounded-xl hover:bg-primary/90 transition-colors"
          >
            {isLast ? 'Começar agora' : 'Próximo'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
