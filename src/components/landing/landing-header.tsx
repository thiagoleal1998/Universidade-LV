'use client'

import { useState, useEffect, useRef } from 'react'
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
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuHeight, setMenuHeight] = useState(0)

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

  useEffect(() => {
    if (!menuRef.current) return
    setMenuHeight(menuOpen ? menuRef.current.scrollHeight : 0)
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

  return (
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

      {/* Mobile menu — altura animada via scrollHeight */}
      <div
        className="md:hidden overflow-hidden"
        style={{
          height: menuHeight,
          transition: 'height 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div ref={menuRef}>
          <div className="border-t border-border/60 mx-4" />
          <nav className="px-3 py-2">
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
      </div>
    </header>
  )
}
