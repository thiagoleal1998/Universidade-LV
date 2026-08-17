'use client'

import { useEffect, useState } from 'react'
import { Cookie, X } from 'lucide-react'

const STORAGE_KEY = 'cookie_consent_v2'
const HINT_DURATION_MS = 15000

type CookiePrefs = { necessary: true; statistics: boolean; marketing: boolean; updatedAt: string }
// 'loading' = ainda não sabemos (server render / antes do efeito de mount) —
// não mostra nada, evita um flash do ícone antes do primeiro render real.
type ViewState = 'loading' | 'icon' | 'modal'

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
  linkText,
  linkUrl,
}: {
  text: string
  buttonText?: string
  linkText?: string
  linkUrl?: string
}) {
  const [view, setView] = useState<ViewState>('loading')
  const [hintVisible, setHintVisible] = useState(false)
  const [statistics, setStatistics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  // Client-only — evita mismatch de hydration (o server sempre renderiza
  // "nada visível", igual o primeiro render do client antes deste efeito).
  // Sem banner persistente: só o ícone aparece; se é a primeira visita (sem
  // preferência salva), uma dica sai do ícone por alguns segundos e some
  // sozinha — pedido do usuário, réplica do padrão de outro site do grupo.
  useEffect(() => {
    const saved = readPrefs()
    setView('icon')
    if (!saved) {
      setHintVisible(true)
      const t = setTimeout(() => setHintVisible(false), HINT_DURATION_MS)
      return () => clearTimeout(t)
    }
  }, [])

  // Trava o scroll da página (as duas direções) enquanto o modal está
  // aberto — sem isso, um overlay `fixed` não impede arrastar a página por
  // baixo dele, e se a página tiver qualquer overflow horizontal (mesmo
  // pequeno, comum em landing pages com elementos decorativos), o gesto de
  // arrastar lateralmente "puxa" a tela inteira, incluindo o próprio modal
  // (que é fixed relativo à viewport, mas a viewport visual em si é
  // arrastada em mobile). Bug real relatado: dava pra mexer a tela de lado
  // com o modal aberto, cortando o conteúdo torto.
  useEffect(() => {
    if (view !== 'modal') return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [view])

  function openSettings() {
    const saved = readPrefs()
    setStatistics(saved?.statistics ?? false)
    setMarketing(saved?.marketing ?? false)
    setHintVisible(false)
    setView('modal')
  }

  function confirmSettings() {
    writePrefs(statistics, marketing)
    setView('icon')
  }

  const hasPlaceholder = linkText && linkUrl && text.includes('{link}')
  const hasAppended = linkText && linkUrl && !text.includes('{link}')
  const parts = hasPlaceholder ? text.split('{link}') : null

  return (
    <>
      {/* Ícone flutuante — único elemento persistente. Aparece assim que o
          efeito de mount roda (visitante novo ou recorrente) e permanece
          pra sempre, permitindo abrir/revisar as preferências quando quiser. */}
      {view !== 'loading' && (
        <button
          type="button"
          onClick={openSettings}
          title="Configurações de cookies"
          className="fixed bottom-4 left-4 z-40 h-11 w-11 rounded-full bg-background border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
        >
          <Cookie className="h-5 w-5 text-foreground" />
        </button>
      )}

      {/* Dica temporária — só na primeira visita (sem preferência salva),
          some sozinha após HINT_DURATION_MS, sem precisar de nenhuma ação
          do visitante. Clicar no ícone durante a dica também a esconde. */}
      <div
        className={`fixed bottom-[4.75rem] left-4 z-40 max-w-[240px] rounded-xl rounded-bl-sm bg-background border border-border shadow-lg px-3.5 py-2.5 transition-all duration-300 ${
          view === 'icon' && hintVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <p className="text-xs text-muted-foreground leading-relaxed">
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
      </div>

      {view === 'modal' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4 overscroll-none">
          <div className="w-full sm:max-w-sm bg-background rounded-t-2xl sm:rounded-2xl border border-border shadow-xl p-5 max-h-[85vh] overflow-y-auto overscroll-contain">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 className="text-base font-bold text-foreground">Configurações de cookies</h2>
              <button onClick={() => setView('icon')} className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 p-1">
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
