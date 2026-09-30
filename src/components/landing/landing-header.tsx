'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { LogIn, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'

type NavItem = { label: string; href: string }

type LandingHeaderProps = {
  siteName: string
  logoUrl: string
  navItems: NavItem[]
}

export function LandingHeader({ siteName, logoUrl, navItems }: LandingHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  // O backdrop/painel ficam SEMPRE montados (visibilidade via opacity, pra
  // animar a transição) — diferente do painel do sino (`notification-bell.tsx`),
  // que só monta quando `open` já é true. `typeof document !== 'undefined'`
  // sozinho não bastava: no client, `document` já existe na primeira renderização
  // (a de hidratação), então o portal aparecia ali sem ter aparecido no HTML
  // do servidor — mismatch de hidratação real. `mounted` some no servidor E na
  // primeira passada do client (só vira true depois, via efeito), igualando as
  // duas primeiras renderizações.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMenuOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // O menu agora é um overlay (fixed) por cima da home, não mais um painel
  // que empurra o conteúdo pra baixo — sem isso, abrir o menu deslocava
  // todo o resto da página (bug real relatado pelo usuário). Trava o scroll
  // de fundo enquanto aberto, mesmo padrão já usado no modal de cookies da
  // landing (`cookie-consent.tsx`) — um `fixed` sozinho não impede arrastar
  // a página por baixo dele.
  useEffect(() => {
    if (!menuOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  // Scroll spy — detecta qual seção está visível
  useEffect(() => {
    const ids = navItems.map(n => n.href.slice(1)).filter(Boolean)
    if (!ids.length) return

    const onScroll = () => {
      const scrollY = window.scrollY + 120
      let current = ''
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(ids[i])
        if (el && el.getBoundingClientRect().top + window.scrollY <= scrollY) {
          current = ids[i]
          break
        }
      }
      setActiveSection(current)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [navItems])

  function scrollTo(href: string) {
    setMenuOpen(false)
    if (!href.startsWith('#')) return
    setTimeout(() => {
      const el = document.getElementById(href.slice(1))
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, menuOpen ? 320 : 0)
  }

  // Backdrop + painel do menu mobile precisam ser portalados pro <body> —
  // o <header> tem backdrop-blur (CSS backdrop-filter), que cria um novo
  // containing block pra qualquer descendente `fixed` (mesma categoria de
  // transform/filter/perspective/will-change). Como filhos do header, os
  // dois posicionavam/dimensionavam relativo à caixa de 64px do header
  // (h-16), não à viewport — o backdrop resultava em height:0, invisível
  // e inclicável, apesar de opacity-100/pointer-events-auto corretos.
  // Mesmo mecanismo já documentado e resolvido em `notification-bell.tsx`
  // (painel portalado pro document.body pelo mesmo motivo).
  const mobileMenu = (
    <>
      {/* Backdrop — fixed a partir da base do header (top-16), nunca cobre
          a própria barra (o botão de fechar precisa continuar clicável).
          Fecha o menu ao tocar fora dele. Transição via `style` inline, não
          `transition-opacity` do Tailwind — ver nota abaixo no painel. */}
      <div
        className={cn(
          'md:hidden fixed top-16 inset-x-0 bottom-0 z-40 bg-black/40',
          menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        style={{ transition: 'opacity 400ms cubic-bezier(0.16,1,0.3,1)' }}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile menu — overlay fixed por cima da home (não empurra o
          conteúdo abaixo dele, ao contrário do painel inline de antes).
          Translate+opacity em vez de scale-y: escalar o eixo Y distorce o
          texto/padding durante a transição e passa uma sensação de "esticar"
          abrupta; deslizar+desvanecer com easing de desaceleração (mesma
          curva usada em menus nativos) fica mais suave. `bg-background/90
          backdrop-blur-md` (em vez de opaco) deixa o conteúdo por trás
          entrever de leve, sem comprometer a leitura do texto por cima.
          **Transição via `style` inline, não classes `transition-*`/`duration-*`/
          `ease-*` do Tailwind**: `globals.css` tem uma regra global não-layered
          (`*, *::before, *::after { transition: background-color, border-color,
          color, box-shadow }`) que, por estar FORA de qualquer `@layer`, vence
          qualquer utilitário do Tailwind (que vive dentro de `@layer utilities`)
          na cascata — regra sem camada sempre bate regra em camada, não importa
          especificidade. Resultado: `opacity`/`transform` (propriedades fora da
          lista fixa daquela regra) nunca transicionavam em NENHUM lugar do app
          via classe Tailwind, só as 4 propriedades cobertas por ela — daí o
          menu "pulando" em vez de animar, apesar das classes certas presentes.
          `style` inline tem prioridade sobre qualquer stylesheet (layered ou
          não), então é o único jeito confiável de transicionar opacity/translate
          enquanto essa regra global existir. **Segunda pegadinha**: Tailwind v4
          não compõe `-translate-y-*` dentro de `transform` — usa a propriedade
          CSS `translate` separada (`getComputedStyle().transform` fica "none",
          quem carrega o deslocamento é `.translate`). Transicionar `transform`
          (como um dev acostumado com v3 assumiria) não tem NENHUM efeito aqui;
          o nome certo pra `transitionProperty` é `translate`. */}
      <div
        className={cn(
          'md:hidden fixed top-16 inset-x-0 z-40 bg-background/90 backdrop-blur-md border-b border-border shadow-lg origin-top',
          menuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-3 pointer-events-none'
        )}
        style={{ transition: 'opacity 450ms cubic-bezier(0.16,1,0.3,1), translate 450ms cubic-bezier(0.16,1,0.3,1)' }}
      >
        <nav className="px-3 py-2 max-h-[calc(100dvh-4rem)] overflow-y-auto">
          {navItems.map((item) => {
            const id = item.href.slice(1)
            const isActive = activeSection === id
            return (
              <button
                key={item.href}
                onClick={() => scrollTo(item.href)}
                className={cn(
                  'w-full text-left px-3 py-3 text-sm rounded-lg transition-colors font-medium flex items-center gap-2',
                  isActive
                    ? 'text-foreground bg-muted'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span className={cn('w-1 h-1 rounded-full shrink-0', isActive ? 'bg-green-600' : 'bg-muted-foreground/40')} />
                {item.label}
              </button>
            )
          })}
          <div className="mx-0 my-1.5 border-t border-border/60" />
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-3 text-sm font-semibold text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Entrar na plataforma
          </Link>
        </nav>
        <div className="h-2" />
      </div>
    </>
  )

  return (
    <>
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-300',
        scrolled || menuOpen
          ? 'bg-background/98 backdrop-blur-md shadow-sm border-b border-border'
          : 'bg-background/80 backdrop-blur border-b border-border'
      )}
    >
      {/* Barra principal */}
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-6">

        {/* Logo + pipe + nome */}
        <div className="flex items-center gap-3 shrink-0">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={siteName} className="h-8 w-auto object-contain" />
          )}
          {logoUrl && (
            <span className="text-border text-xl font-light select-none">|</span>
          )}
          <span className="font-bold text-base text-foreground">{siteName}</span>
        </div>

        {/* Nav desktop */}
        {navItems.length > 0 && (
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            {navItems.map((item) => {
              const id = item.href.slice(1)
              const isActive = activeSection === id
              return (
                <button
                  key={item.href}
                  onClick={() => scrollTo(item.href)}
                  className={cn(
                    'px-3.5 py-1.5 text-sm rounded-lg transition-colors font-medium',
                    isActive
                      ? 'text-foreground bg-muted'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        )}

        {/* Ações */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle className="hidden sm:flex" />
          <Link
            href="/login"
            className="hidden lg:inline text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Já sou membro
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold bg-orange-500 text-white px-4 py-2.5 rounded-lg hover:bg-orange-600 transition-colors min-h-[44px]"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Entrar</span>
          </Link>

          {navItems.length > 0 && (
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                'md:hidden w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200',
                menuOpen
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              <div className="relative w-4 h-4">
                <Menu className={cn('w-4 h-4 absolute inset-0 transition-all duration-200', menuOpen ? 'opacity-0 rotate-90' : 'opacity-100 rotate-0')} />
                <X className={cn('w-4 h-4 absolute inset-0 transition-all duration-200', menuOpen ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90')} />
              </div>
            </button>
          )}
        </div>
      </div>
    </header>
    {mounted && createPortal(mobileMenu, document.body)}
    </>
  )
}
