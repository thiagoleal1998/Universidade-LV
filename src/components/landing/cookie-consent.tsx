'use client'

import { useEffect, useState } from 'react'
import { Cookie, X } from 'lucide-react'

const STORAGE_KEY = 'cookie_consent_v2'

type CookiePrefs = { necessary: true; statistics: boolean; marketing: boolean; updatedAt: string }
// 'loading' = ainda não sabemos (server render / antes do efeito de mount) —
// não mostra nada, evita um flash do ícone antes de decidir se é visitante
// novo (teria que mostrar o banner) ou recorrente (só o ícone).
type ViewState = 'loading' | 'hidden' | 'initial-banner' | 'modal'

function readPrefs(): CookiePrefs | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.statistics === 'boolean' && typeof parsed.marketing === 'boolean') return parsed
    return null
  } catch {
    return null
  }
}

function writePrefs(statistics: boolean, marketing: boolean) {
  const prefs: CookiePrefs = { necessary: true, statistics, marketing, updatedAt: new Date().toISOString() }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)) } catch {}
}

// Pra scripts futuros de analytics/marketing checarem antes de injetar a tag
// (hoje o site não carrega nenhum — ver comentário mais abaixo).
export function getCookiePrefs(): CookiePrefs | null {
  if (typeof window === 'undefined') return null
  return readPrefs()
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  locked,
}: {
  title: string
  description: string
  checked: boolean
  onChange?: (v: boolean) => void
  locked?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-b-0">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
      {locked ? (
        <span className="shrink-0 text-[11px] font-medium text-muted-foreground mt-0.5">Sempre ativo</span>
      ) : (
        <button
          type="button"
          onClick={() => onChange?.(!checked)}
          className={`shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors mt-0.5 ${checked ? 'bg-green-700' : 'bg-muted'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
        </button>
      )}
    </div>
  )
}

export function CookieConsent({
  text,
  buttonText = 'Aceitar e continuar',
  linkText,
  linkUrl,
}: {
  text: string
  buttonText?: string
  linkText?: string
  linkUrl?: string
}) {
  const [view, setView] = useState<ViewState>('loading')
  const [statistics, setStatistics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  // Client-only — evita mismatch de hydration (o server sempre renderiza
  // "nada visível", igual o primeiro render do client antes deste efeito).
  useEffect(() => {
    setView(readPrefs() ? 'hidden' : 'initial-banner')
  }, [])

  function openSettings() {
    const saved = readPrefs()
    setStatistics(saved?.statistics ?? false)
    setMarketing(saved?.marketing ?? false)
    setView('modal')
  }

  function acceptAll() {
    writePrefs(true, true)
    setView('hidden')
  }

  function confirmSettings() {
    writePrefs(statistics, marketing)
    setView('hidden')
  }

  const hasPlaceholder = linkText && linkUrl && text.includes('{link}')
  const hasAppended = linkText && linkUrl && !text.includes('{link}')
  const parts = hasPlaceholder ? text.split('{link}') : null

  return (
    <>
      {/* Ícone flutuante — só quando nada mais está na tela (banner inicial já
          decidido, ou modal fechado). O banner inicial ocupa a faixa inferior
          inteira (mesmo canto, z-index maior) e cobriria o ícone por baixo
          se os dois aparecessem juntos — por isso não é `view !== 'modal'`,
          e sim só `'hidden'`. Uma vez visível, permanece pra sempre,
          permitindo revisar a escolha a qualquer momento. */}
      {view === 'hidden' && (
        <button
          type="button"
          onClick={openSettings}
          title="Configurações de cookies"
          className="fixed bottom-4 left-4 z-40 h-11 w-11 rounded-full bg-background border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
        >
          <Cookie className="h-5 w-5 text-foreground" />
        </button>
      )}

      {view === 'initial-banner' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/97 backdrop-blur-md px-4 py-3 shadow-lg">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center gap-3">
            <p className="flex-1 text-xs text-muted-foreground text-center sm:text-left leading-relaxed">
              {parts ? (
                <>
                  {parts[0]}
                  <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">
                    {linkText}
                  </a>
                  {parts[1]}
                </>
              ) : hasAppended ? (
                <>
                  {text}{' '}
                  <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">
                    {linkText}
                  </a>
                </>
              ) : (
                text
              )}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={openSettings}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border border-border transition-colors"
              >
                Configurações
              </button>
              <button
                onClick={acceptAll}
                className="bg-green-700 hover:bg-green-800 text-white font-semibold text-xs px-5 py-2 rounded-lg transition-colors"
              >
                {buttonText}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'modal' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
          <div className="w-full sm:max-w-sm bg-background rounded-t-2xl sm:rounded-2xl border border-border shadow-xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 className="text-base font-bold text-foreground">Configurações de cookies</h2>
              <button onClick={() => setView('hidden')} className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Você pode escolher quais cookies quer aceitar.</p>

            <div className="mt-2">
              <ToggleRow
                title="Cookies obrigatórios"
                description="Garantem o funcionamento adequado do site."
                checked
                locked
              />
              <ToggleRow
                title="Cookies de estatísticas"
                description="Usados pra entender como o site é utilizado e melhorar a experiência."
                checked={statistics}
                onChange={setStatistics}
              />
              <ToggleRow
                title="Cookies de marketing"
                description="Usados pra exibir conteúdo e publicidade mais relevantes."
                checked={marketing}
                onChange={setMarketing}
              />
            </div>

            <button
              onClick={confirmSettings}
              className="w-full mt-4 bg-green-700 hover:bg-green-800 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Confirmar configurações
            </button>
          </div>
        </div>
      )}
    </>
  )
}
