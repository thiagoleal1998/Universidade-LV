'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import React, { useState, useEffect, CSSProperties } from 'react'
import { logout } from '@/app/actions/auth'
import { ThemeToggle } from '@/components/theme-toggle'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Home, MessageSquare, FileText, Settings, GraduationCap, LogOut, Search, Menu, X, BookOpen,
  PanelLeftClose, PanelLeftOpen, Headphones, Megaphone, Plane, Briefcase, Users2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_VERSION } from '@/lib/version'
import { NotificationBell } from '@/components/members/notification-bell'
import { MemberFeedbackWidget } from '@/components/members/member-feedback-widget'

type NavLabels = Record<string, string>

const DEFAULT_NAV_LABELS: NavLabels = {
  home: 'Início', cursos: 'Meus cursos', treinamentos: 'Treinamentos',
  marketing: 'Marketing', aereo: 'Bloqueios Aéreos', comercial: 'Condições Comerciais', grupos: 'Grupos',
  podviajar: 'PodViajar', comunidade: 'Comunidade', documentos: 'Documentos', configuracoes: 'Configurações',
}

function parseNavLabels(json: string): NavLabels {
  try { return { ...DEFAULT_NAV_LABELS, ...JSON.parse(json) } } catch {}
  return { ...DEFAULT_NAV_LABELS }
}

function parseMemberNavOrder(json: string): string[] {
  const DEFAULT = ['home', 'cursos', 'treinamentos', 'marketing', 'aereo', 'comercial', 'grupos', 'podviajar', 'comunidade', 'documentos', 'configuracoes']
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Chaves novas (ex.: item de menu adicionado depois que o admin já
      // salvou a ordem) não existem no array salvo — sem isso, o item novo
      // nunca aparece até o admin reabrir e salvar Configurações de novo.
      const known = new Set(parsed)
      const missing = DEFAULT.filter((k) => !known.has(k))
      return [...parsed.filter((k: string) => DEFAULT.includes(k)), ...missing]
    }
  } catch {}
  return DEFAULT
}

type Props = {
  siteName: string
  logoUrl: string
  userName: string
  userEmail: string
  avatarUrl: string
  unreadCount?: number
  areaSubtitle?: string
  memberNavLabels?: string
  podviajarActive?: boolean
  aereoActive?: boolean
  comercialActive?: boolean
  gruposActive?: boolean
  memberNavOrder?: string
  showFeedbackButton?: boolean
  // Admin/colaborador estudando em /dashboard — ao clicar numa notificação de
  // chamado, deve permanecer no ambiente de colaborador (/admin/feedback), não
  // ser jogado pro fluxo de aluno só por estar navegando aqui no momento.
  isCollaboratorOrAdmin?: boolean
}

// Smooth slide-out for text elements — max-width + opacity
function slideText(collapsed: boolean, maxW = 180): CSSProperties {
  return {
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    maxWidth: collapsed ? 0 : maxW,
    opacity: collapsed ? 0 : 1,
    transition: collapsed
      ? 'max-width 240ms cubic-bezier(0.4,0,0.6,1), opacity 160ms ease'
      : 'max-width 280ms cubic-bezier(0.0,0,0.2,1) 60ms, opacity 200ms ease 80ms',
  }
}

const MEMBER_NAV_MAP: Record<string, { href: string; icon: React.ComponentType<{ className?: string }>; exact: boolean; conditional?: 'aereo' | 'podviajar' | 'comercial' | 'grupos' }> = {
  home:          { href: '/dashboard',               icon: Home,          exact: true  },
  cursos:        { href: '/dashboard/cursos',        icon: GraduationCap, exact: false },
  treinamentos:  { href: '/dashboard/treinamentos',  icon: BookOpen,      exact: false },
  marketing:     { href: '/dashboard/marketing',     icon: Megaphone,     exact: false },
  aereo:         { href: '/dashboard/aereo',         icon: Plane,         exact: false, conditional: 'aereo'      },
  comercial:     { href: '/dashboard/comercial',     icon: Briefcase,     exact: false, conditional: 'comercial'  },
  grupos:        { href: '/dashboard/grupos',        icon: Users2,        exact: false, conditional: 'grupos'     },
  podviajar:     { href: '/dashboard/podviajar',     icon: Headphones,    exact: false, conditional: 'podviajar'  },
  comunidade:    { href: '/dashboard/comunidade',    icon: MessageSquare, exact: false },
  documentos:    { href: '/dashboard/documentos',    icon: FileText,      exact: false },
  configuracoes: { href: '/dashboard/configuracoes', icon: Settings,      exact: false },
}

function SidebarContent({
  siteName, logoUrl, userName, userEmail, avatarUrl, unreadCount = 0,
  areaSubtitle = 'Área do Aluno', memberNavLabels = '', memberNavOrder = '', podviajarActive = false, aereoActive = false, comercialActive = false, gruposActive = false,
  showFeedbackButton = false,
  isCollaboratorOrAdmin = false,
  onClose, collapsed = false, onToggleCollapse,
}: Props & { onClose?: () => void; collapsed?: boolean; onToggleCollapse?: () => void }) {
  const pathname = usePathname()
  const labels = parseNavLabels(memberNavLabels)
  const navOrder = parseMemberNavOrder(memberNavOrder)

  const NAV_ITEMS = navOrder
    .filter((key) => {
      const def = MEMBER_NAV_MAP[key]
      if (!def) return false
      if (def.conditional === 'aereo') return aereoActive
      if (def.conditional === 'comercial') return comercialActive
      if (def.conditional === 'grupos') return gruposActive
      if (def.conditional === 'podviajar') return podviajarActive
      return true
    })
    .map((key) => {
      const def = MEMBER_NAV_MAP[key]
      return { href: def.href, label: labels[key] ?? key, icon: def.icon, exact: def.exact }
    })

  const initials = userName
    ? userName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : (userEmail[0]?.toUpperCase() ?? 'U')

  const isProfileActive = pathname === '/dashboard/perfil'

  return (
    <div className="flex flex-col h-full">

      {/* ── Brand — logo always visible ── */}
      <div className="border-b border-black/10 shrink-0 flex items-center px-3 py-4 gap-2.5 min-h-[64px]">
        <Link
          href="/dashboard"
          onClick={onClose}
          title={collapsed ? siteName : undefined}
          className="shrink-0"
        >
          {logoUrl ? (
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/20 shadow-sm bg-white/10">
              <Image src={logoUrl} alt={siteName} width={32} height={32} className="object-contain w-full h-full" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shadow-sm">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
          )}
        </Link>

        {/* Text slides out when collapsed */}
        <div className="flex-1 min-w-0" style={slideText(collapsed, 155)}>
          <p className="text-sm font-semibold text-white truncate leading-tight">{siteName}</p>
          <p className="text-xs text-white/70 font-medium">{areaSubtitle}</p>
        </div>

        {/* Mobile: close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">

        {/* Search */}
        <button
          type="button"
          title={collapsed ? 'Busca rápida (Ctrl K)' : undefined}
          className={cn(
            'w-full flex items-center rounded-lg text-xs text-white/70 border border-dashed border-white/25',
            'hover:border-white/40 hover:bg-white/10 transition-colors mb-1',
            collapsed ? 'justify-center p-2.5' : 'gap-2 px-3 py-2',
          )}
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span style={slideText(collapsed, 130)} className="flex-1 text-left">Busca rápida</span>
          {/* kbd uses slideText so it takes 0px layout space when collapsed */}
          <kbd style={slideText(collapsed, 58)} className="text-xs bg-white/15 text-white px-1.5 py-0.5 rounded font-mono hidden md:block">
            Ctrl K
          </kbd>
        </button>

        {/* Nav items */}
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center rounded-lg font-medium transition-colors',
                collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 text-sm',
                isActive
                  ? 'bg-white/15 text-white border border-white/25'
                  : 'text-white/70 hover:bg-white/10 hover:text-white border border-transparent',
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', isActive && 'text-white')} />
              <span style={slideText(collapsed, 172)}>{label}</span>
            </Link>
          )
        })}

        <MemberFeedbackWidget visible={showFeedbackButton} collapsed={collapsed} onNavigate={onClose} />

      </nav>

      {/* ── Collapse toggle — fixed, never scrolls ── */}
      {onToggleCollapse && (
        <div className="px-2 pb-1 shrink-0">
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expandir menu' : 'Minimizar menu'}
            className={cn(
              'w-full flex items-center rounded-lg font-medium transition-colors',
              'text-white/70 hover:bg-white/10 hover:text-white border border-transparent',
              collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 text-sm',
            )}
          >
            {collapsed
              ? <PanelLeftOpen className="w-4 h-4 shrink-0" />
              : <PanelLeftClose className="w-4 h-4 shrink-0" />}
            <span style={slideText(collapsed, 120)}>Minimizar</span>
          </button>
        </div>
      )}

      {/* ── User footer ── */}
      <div className="px-2 py-3 border-t border-black/10 shrink-0">
        {collapsed ? (
          /* Collapsed: icons stacked, centered */
          <div className="flex flex-col items-center gap-1.5">
            <Link
              href="/dashboard/perfil"
              title={userName || 'Perfil'}
              className={cn('p-1 rounded-lg transition-colors', isProfileActive ? 'bg-white/15' : 'hover:bg-white/10')}
            >
              <Avatar className="w-7 h-7">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                <AvatarFallback className="text-xs bg-white/20 text-white font-semibold">{initials}</AvatarFallback>
              </Avatar>
            </Link>
            <NotificationBell unreadCount={unreadCount} placement="sidebar" redirectFeedbackToAdmin={isCollaboratorOrAdmin} triggerClassName="text-white/70 hover:text-white hover:bg-white/10" />
            <ThemeToggle className="text-white/70 hover:text-white hover:bg-white/10" />
            <form action={logout}>
              <button
                type="submit"
                title="Sair"
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          /* Expanded: full user info + actions */
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Link
                href="/dashboard/perfil"
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-lg flex-1 min-w-0 transition-colors',
                  isProfileActive ? 'bg-white/15' : 'hover:bg-white/10',
                )}
              >
                <Avatar className="w-7 h-7 shrink-0">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                  <AvatarFallback className="text-xs bg-white/20 text-white font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  {userName && <p className="text-xs font-medium truncate text-white">{userName}</p>}
                  <p className="text-xs text-white/60 truncate">{userEmail}</p>
                </div>
              </Link>
              <NotificationBell unreadCount={unreadCount} placement="sidebar" redirectFeedbackToAdmin={isCollaboratorOrAdmin} triggerClassName="text-white/70 hover:text-white hover:bg-white/10" />
              <ThemeToggle className="text-white/70 hover:text-white hover:bg-white/10" />
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-3 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium h-8"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Sair
              </button>
            </form>
            <p className="text-xs text-white/30 font-mono text-center pt-1">v{APP_VERSION}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function MemberSidebar(props: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const pathname = usePathname()
  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  useEffect(() => {
    const stored = localStorage.getItem('sidebar_collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('sidebar_collapsed', String(next))
      return next
    })
  }

  return (
    <>
      {/* ── Mobile top bar ── */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-primary border-b border-black/10 z-30 flex items-center gap-3 px-4 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {props.logoUrl ? (
          <Image src={props.logoUrl} alt={props.siteName} width={24} height={24} className="object-contain" />
        ) : (
          <GraduationCap className="w-5 h-5 text-white" />
        )}
        <span className="text-sm font-semibold text-white truncate">{props.siteName}</span>
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell unreadCount={props.unreadCount ?? 0} placement="sidebar" redirectFeedbackToAdmin={props.isCollaboratorOrAdmin} triggerClassName="text-white/70 hover:text-white hover:bg-white/10" />
          <ThemeToggle className="text-white/70 hover:text-white hover:bg-white/10" />
        </div>
      </header>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile sidebar ── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-primary md:hidden',
          'transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarContent {...props} onClose={() => setMobileOpen(false)} />
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden md:flex md:flex-col md:shrink-0 bg-primary overflow-hidden"
        style={{
          width: collapsed ? 60 : 240,
          transition: 'width 300ms cubic-bezier(0.4,0,0.2,1)',
          willChange: 'width',
        }}
      >
        <SidebarContent
          {...props}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
      </aside>
    </>
  )
}
