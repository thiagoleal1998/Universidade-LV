'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Bell, Zap, PlayCircle, Volume2, VolumeX, Check, Sun, Moon, Monitor } from 'lucide-react'

type Prefs = {
  autoAdvance: boolean
  notifSound: boolean
  defaultSpeed: string
}

const DEFAULT_PREFS: Prefs = { autoAdvance: true, notifSound: true, defaultSpeed: '1' }

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem('member_prefs')
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_PREFS
}

function savePrefs(prefs: Prefs) {
  localStorage.setItem('member_prefs', JSON.stringify(prefs))
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none ${enabled ? 'bg-primary' : 'bg-muted'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  )
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Automático', icon: Monitor },
] as const

export default function ConfiguracoesPage() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [saved, setSaved] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setPrefs(loadPrefs()) }, [])
  useEffect(() => { setMounted(true) }, [])

  function update(patch: Partial<Prefs>) {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    savePrefs(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="p-4 md:p-8 max-w-xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">Preferências da sua experiência de aprendizado.</p>
        </div>
        {saved && (
          <div className="flex items-center gap-1.5 text-sm text-primary bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5">
            <Check className="w-3.5 h-3.5" />
            Salvo
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* Aparência */}
        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sun className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Aparência</h2>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Tema</p>
            <div className="flex gap-2 flex-wrap">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  disabled={!mounted}
                  onClick={() => setTheme(value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    mounted && theme === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notificações */}
        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Notificações</h2>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              {prefs.notifSound ? <Volume2 className="w-4 h-4 text-muted-foreground" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
              <div>
                <p className="text-sm font-medium text-foreground">Som de notificação</p>
                <p className="text-xs text-muted-foreground">Toca um som ao receber novos avisos</p>
              </div>
            </div>
            <Toggle enabled={prefs.notifSound} onToggle={() => update({ notifSound: !prefs.notifSound })} />
          </div>
        </div>

        {/* Aulas */}
        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <PlayCircle className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Aulas</h2>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border pb-4 mb-4">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Avançar automaticamente</p>
                <p className="text-xs text-muted-foreground">Vai para a próxima aula ao concluir a atual</p>
              </div>
            </div>
            <Toggle enabled={prefs.autoAdvance} onToggle={() => update({ autoAdvance: !prefs.autoAdvance })} />
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Velocidade padrão dos vídeos</p>
            <div className="flex gap-2 flex-wrap">
              {['0.75', '1', '1.25', '1.5', '2'].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => update({ defaultSpeed: speed })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    prefs.defaultSpeed === speed
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {speed}×
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Preferências salvas neste dispositivo.
      </p>
    </div>
  )
}
