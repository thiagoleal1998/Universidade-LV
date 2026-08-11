'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Spinner } from '@/components/ui/spinner'

// "Barra fina no topo desde o clique + overlay de tela cheia se demorar mais
// que OVERLAY_DELAY_MS" — decisão do usuário (2026-08-06): navegação entre
// páginas nesta plataforma já é documentadamente lenta (~1.8-3s, ver notas
// de "Card clicável do Dashboard" e navegação de aula no CLAUDE.md) e sem
// nenhum feedback visual, dando a usuários a impressão de que travou.
const OVERLAY_DELAY_MS = 500
const SAFETY_TIMEOUT_MS = 15000

function NavigationProgressInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchKey = searchParams.toString()

  const [barVisible, setBarVisible] = useState(false)
  const [barWidth, setBarWidth] = useState(0)
  const [overlayVisible, setOverlayVisible] = useState(false)

  const pendingRef = useRef(false)
  const overlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Espelha barVisible/overlayVisible em ref pra não precisar recriar
  // start/finish a cada render (evitaria closures obsoletas no listener).
  const barVisibleRef = useRef(false)
  const overlayVisibleRef = useRef(false)

  function clearTimers() {
    if (overlayTimer.current) clearTimeout(overlayTimer.current)
    if (safetyTimer.current) clearTimeout(safetyTimer.current)
    if (finishTimer.current) clearTimeout(finishTimer.current)
  }

  function setBar(visible: boolean) {
    barVisibleRef.current = visible
    setBarVisible(visible)
  }
  function setOverlay(visible: boolean) {
    overlayVisibleRef.current = visible
    setOverlayVisible(visible)
  }

  function reset() {
    clearTimers()
    pendingRef.current = false
    setOverlay(false)
    setBar(false)
    setBarWidth(0)
  }

  function start() {
    clearTimers()
    pendingRef.current = true
    setOverlay(false)
    setBar(true)
    setBarWidth(0)
    // Dois rAF garantem que o navegador pinte a largura 0% antes de animar
    // pra ~85% — sem isso o browser pode agrupar as duas mudanças no mesmo
    // frame e a transição CSS não roda.
    requestAnimationFrame(() => requestAnimationFrame(() => setBarWidth(85)))

    overlayTimer.current = setTimeout(() => {
      if (!pendingRef.current) return
      setBar(false)
      setOverlay(true)
    }, OVERLAY_DELAY_MS)

    // Se a navegação nunca completar de verdade (erro, download que não
    // troca de página, etc.), não deixa o indicador travado pra sempre.
    safetyTimer.current = setTimeout(reset, SAFETY_TIMEOUT_MS)
  }

  function finish() {
    if (!pendingRef.current) return
    pendingRef.current = false
    clearTimers()
    if (overlayVisibleRef.current) {
      setOverlay(false)
      return
    }
    if (barVisibleRef.current) {
      setBarWidth(100)
      finishTimer.current = setTimeout(() => {
        setBar(false)
        setBarWidth(0)
      }, 250)
    }
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const anchor = (e.target as HTMLElement | null)?.closest?.('a')
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return

      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      // Rotas de API/download (ex.: exportar CSV) não navegam de verdade —
      // a página nunca troca, então o indicador nunca seria escondido.
      if (url.pathname.startsWith('/api/')) return

      const nextPath = url.pathname + url.search
      const currentPath = window.location.pathname + window.location.search
      if (nextPath === currentPath) return

      start()
    }

    // Capture phase: garante que o clique é visto mesmo se algum componente
    // no meio do caminho chamar stopPropagation() na fase de bubble.
    document.addEventListener('click', handleClick, { capture: true })
    return () => document.removeEventListener('click', handleClick, { capture: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isFirstRun = useRef(true)
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchKey])

  useEffect(() => () => clearTimers(), [])

  return (
    <>
      {barVisible && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none" aria-hidden>
          <div
            className="h-full bg-primary transition-[width] duration-700 ease-out"
            style={{ width: `${barWidth}%` }}
          />
        </div>
      )}
      {overlayVisible && (
        <div
          role="status"
          aria-live="polite"
          // z-[10000], acima do z-[9999] do sino de notificações — sem
          // isso, o sino (mais tarde no DOM que este componente, montado
          // aqui na raiz antes de {children}) ganhava o empate de z-index
          // e ficava visível por cima do fundo escurecido, "no primeiro
          // plano" durante uma navegação lenta — bug real relatado pelo
          // Cesar, mais perceptível no admin (páginas mais pesadas, esse
          // overlay aparece com mais frequência) mas presente pros dois
          // papéis, já que é o mesmo componente global.
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-3 bg-background/75 backdrop-blur-[2px]"
        >
          <Spinner className="w-10 h-10" />
          <p className="text-sm font-medium text-muted-foreground">Carregando...</p>
        </div>
      )}
    </>
  )
}

// useSearchParams precisa de um Suspense boundary — embutido aqui pra quem
// usa este componente não precisar lembrar disso.
export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  )
}
