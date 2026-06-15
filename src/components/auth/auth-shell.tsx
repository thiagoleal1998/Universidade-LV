'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { GraduationCap } from 'lucide-react'
import type { Settings } from '@/lib/settings'
import { ThemeToggle } from '@/components/theme-toggle'
import { APP_VERSION } from '@/lib/version'

type TypewriterPhase = 'typing' | 'deleting'

function RotatingMessage({ messages }: { messages: string[] }) {
  const [displayed, setDisplayed] = useState('')
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [phase, setPhase] = useState<TypewriterPhase>('typing')

  useEffect(() => {
    if (messages.length === 0) return
    const current = messages[phraseIndex]

    let delay: number
    let action: () => void

    if (phase === 'typing') {
      if (displayed.length < current.length) {
        // Still typing — vary speed slightly for a natural feel
        delay = 45 + Math.random() * 35
        action = () => setDisplayed(current.slice(0, displayed.length + 1))
      } else if (messages.length > 1) {
        // Finished typing — pause before deleting
        delay = 2800
        action = () => setPhase('deleting')
      } else {
        return // Single message: stay as-is, keep cursor blinking
      }
    } else {
      // Deleting
      if (displayed.length > 0) {
        delay = 20 + Math.random() * 20
        action = () => setDisplayed((d) => d.slice(0, -1))
      } else {
        // Deleted — brief pause then start typing next phrase
        delay = 350
        action = () => {
          setPhraseIndex((i) => (i + 1) % messages.length)
          setPhase('typing')
        }
      }
    }

    const t = setTimeout(action, delay)
    return () => clearTimeout(t)
  }, [displayed, phraseIndex, phase, messages])

  if (!messages.length) return null

  return (
    <p className="text-primary-foreground/80 text-base font-medium text-center leading-snug min-h-[1.5em]">
      {displayed}
      <span className="inline-block w-[2px] h-[1em] bg-primary-foreground/70 ml-[1px] align-middle animate-pulse" />
    </p>
  )
}

function BrandingLogo({ settings }: { settings: Settings }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const isDark = mounted && resolvedTheme === 'dark'
  const src = isDark && settings.login_logo_dark_url
    ? settings.login_logo_dark_url
    : (settings.login_logo_url || settings.logo_url)

  if (!src) return null
  return (
    <Image src={src} alt={settings.site_name} width={1200} height={500} className="object-contain w-full h-full" />
  )
}

export function AuthShell({
  settings,
  messages,
  children,
}: {
  settings: Settings
  messages: string[]
  children: React.ReactNode
}) {
  const hasLogo = !!(settings.login_logo_url || settings.logo_url)

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left panel */}
      <div className="hidden md:flex md:w-[55%] bg-primary flex-col items-center justify-center p-14 relative overflow-hidden">
        <div className="absolute -top-28 -left-28 w-96 h-96 rounded-full bg-primary-foreground/5 pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full bg-primary-foreground/5 pointer-events-none" />
        <div className="absolute top-[40%] -right-16 w-52 h-52 rounded-full bg-primary-foreground/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center w-full max-w-xs gap-8">
          {hasLogo ? (
            <div
              className="w-full rounded-2xl overflow-hidden bg-primary-foreground/10 border border-primary-foreground/20 p-3 flex items-center justify-center"
              style={{ aspectRatio: '12/5' }}
            >
              <BrandingLogo settings={settings} />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-primary-foreground/10 border border-primary-foreground/20 flex items-center justify-center">
              <GraduationCap className="w-10 h-10 text-primary-foreground" />
            </div>
          )}

          <div>
            <h1 className="text-2xl font-bold text-primary-foreground tracking-tight">{settings.site_name}</h1>
            {settings.site_tagline && (
              <p className="text-primary-foreground/60 mt-1.5 text-sm">{settings.site_tagline}</p>
            )}
          </div>

          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-primary-foreground/20" />
            <span className="text-primary-foreground/30 text-xs">✦</span>
            <div className="flex-1 h-px bg-primary-foreground/20" />
          </div>

          <div className="min-h-[3rem] flex items-center justify-center">
            <RotatingMessage messages={messages} />
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-14 bg-background relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        {/* Mobile logo */}
        <div className="flex md:hidden flex-col items-center gap-3 mb-10 w-full max-w-xs">
          {hasLogo ? (
            <div
              className="w-full rounded-xl overflow-hidden border border-border p-2 bg-muted flex items-center justify-center"
              style={{ aspectRatio: '12/5' }}
            >
              <BrandingLogo settings={settings} />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-primary-foreground" />
            </div>
          )}
          <p className="text-lg font-bold text-foreground">{settings.site_name}</p>
        </div>

        {children}

        <footer className="absolute bottom-0 left-0 right-0 px-6 py-4 flex flex-col sm:flex-row items-center justify-center gap-1 text-center pointer-events-none">
          <p className="text-xs text-muted-foreground">©2026 Todos os direitos reservados.</p>
          <span className="hidden sm:inline text-muted-foreground/40 text-xs">|</span>
          <p className="text-xs text-muted-foreground">L. V. Operadora de Viagens e Turismo Ltda</p>
          <span className="hidden sm:inline text-muted-foreground/40 text-xs">|</span>
          <p className="text-xs text-muted-foreground">CNPJ: 10.218.043/0001-00</p>
          <span className="hidden sm:inline text-muted-foreground/40 text-xs">|</span>
          <p className="text-xs text-muted-foreground/50 font-mono">v{APP_VERSION}</p>
        </footer>
      </div>
    </div>
  )
}
