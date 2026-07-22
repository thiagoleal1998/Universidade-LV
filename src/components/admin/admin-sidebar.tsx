'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect, CSSProperties } from 'react'
import { logout } from '@/app/actions/auth'
import { ThemeToggle } from '@/components/theme-toggle'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  BookOpen, Users, LayoutDashboard, LogOut, Settings, GraduationCap,
  Megaphone, BarChart2, FileText, Presentation, MessageSquare,
  SearchCheck, HelpCircle, Menu, X, PanelLeftClose, PanelLeftOpen, Bug, Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_VERSION } from '@/lib/version'
import { NotificationBell } from '@/components/members/notification-bell'

const NAV_ITEMS = [
  { href: '/admin',                label: 'Dashboard',     icon: LayoutDashboard, exact: true  },
  { href: '/admin/cursos',         label: 'Cursos',        icon: BookOpen,        exact: false },
  { href: '/admin/membros',        label: 'Membros',       icon: Users,           exact: false },
  { href: '/admin/comunicados',    label: 'Comunicados',   icon: Megaphone,       exact: false },
  { href: '/admin/documentos',     label: 'Documentos',    icon: FileText,        exact: false },
  { href: '/admin/comunidade',     label: 'Comunidade',    icon: MessageSquare,   exact: false },
  { href: '/admin/feedback',       label: 'Feedback',      icon: Bug,             exact: false },
  { href: '/admin/marketing',      label: 'Marketing',     icon: Presentation,    exact: false },
  { href: '/admin/relatorios',     label: 'Relatórios',    icon: BarChart2,       exact: false },
  { href: '/admin/seo',            label: 'SEO',           icon: SearchCheck,     exact: false },
  { href: '/admin/faq',            label: 'FAQ',           icon: HelpCircle,      exact: false },
  { href: '/admin/configuracoes',  label: 'Configurações', icon: Settings,        exact: false },
]

type Props = {
  siteName: string
  logoUrl: string
  userName: string
  userEmail: string
  avatarUrl: string
  navOrder?: string[]
  unreadCount?: number
  // null = admin (todos os itens); array = colaborador (só os hrefs listados)
  allowedHrefs?: string[] | null
  // Papel efetivo (considera o modo prévia) — controla só o rótulo "Painel
  // Admin"/"Painel do Colaborador", nada de autorização real.
  role?: 'admin' | 'collaborator'
  previewActive?: boolean
  previewAreaName?: string | null
}

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

function SidebarContent({
  siteName, logoUrl, userName, userEmail, avatarUrl, navOrder, unreadCount = 0,
  allowedHrefs = null, role = 'admin', previewActive = false, previewAreaName = null,
  onClose, collapsed = false, onToggleCollapse,
}: Props & { onClose?: () => void; collapsed?: boolean; onToggleCollapse?: () => void }) {
  const pathname = usePathname()

  // Navegação de verdade (GET), não Server Action — ver comentário em
  // src/app/api/admin/preview/route.ts.
  function exitPreview() {
    window.location.href = '/api/admin/preview'
  }

  const visibleNavItems = allowedHrefs === null
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => allowedHrefs.includes(item.href))

  const sortedNavItems = navOrder && navOrder.length > 0
    ? [...visibleNavItems].sort((a, b) => {
        const ai = navOrder.indexOf(a.href)
        const bi = navOrder.indexOf(b.href)
        if (ai === -1 && bi === -1) return 0
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
    : visibleNavItems

  const initials = userName
    ? userName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : (userEmail[0]?.toUpperCase() ?? 'A')

  const isProfileActive = pathname === '/admin/perfil'

  return (
    <div className="flex flex-col h-full">

      {/* ── Brand — logo always visible ── */}
      <div className="border-b border-border bg-primary/5 shrink-0 flex items-center px-3 py-4 gap-2.5 min-h-[64px]">
        <Link
          href="/admin"
          onClick={onClose}
          title={collapsed ? siteName : undefined}
          className="shrink-0"
        >
          {logoUrl ? (
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-border shadow-sm">
              <Image src={logoUrl} alt={siteName} width={32} height={32} className="object-contain w-full h-full" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <GraduationCap className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0" style={slideText(collapsed, 155)}>
          <p className="text-sm font-semibold text-foreground truncate leading-tight">{siteName}</p>
          <p className="text-xs text-primary/70 font-medium">
            {role === 'admin' ? 'Painel Admin' : 'Painel do Colaborador'}
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {sortedNavItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + '/')
          // Feedback é roxo em todo lugar (admin, colaborador, área do aluno)
          // — mesmo esquema de cor do MemberFeedbackWidget, pra ficar
          // reconhecível como a mesma funcionalidade em qualquer ambiente.
          const isFeedback = href === '/admin/feedback'
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center rounded-lg font-medium transition-colors',
                collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 text-sm',
                isFeedback
                  ? (isActive
                      ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20'
                      : 'text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 border border-transparent')
                  : (isActive
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'),
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', isActive && !isFeedback && 'text-primary')} />
              <span style={slideText(collapsed, 140)}>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── Banner de modo prévia ── */}
      {previewActive && !collapsed && (
        <div className="mx-2 mb-2 shrink-0 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-2">
          <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 shrink-0" /> Modo prévia: Colaborador{previewAreaName ? ` (${previewAreaName})` : ''}
          </p>
          <button
            type="button"
            onClick={exitPreview}
            className="mt-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
          >
            Sair da prévia
          </button>
        </div>
      )}

      {/* ── Collapse toggle — fixed, never scrolls ── */}
      {onToggleCollapse && (
        <div className="px-2 pb-1 shrink-0">
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expandir menu' : 'Minimizar menu'}
            className={cn(
              'w-full flex items-center rounded-lg font-medium transition-colors',
              'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent',
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
      <div className="px-2 py-3 border-t border-border shrink-0">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <Link
              href="/admin/perfil"
              title={userName || 'Perfil'}
              className={cn('p-1 rounded-lg transition-colors', isProfileActive ? 'bg-primary/10' : 'hover:bg-muted')}
            >
              <Avatar className="w-7 h-7">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
              </Avatar>
            </Link>
            <NotificationBell unreadCount={unreadCount} placement="sidebar" isAdmin />
            <ThemeToggle />
            <form action={logout}>
              <button
                type="submit"
                title="Sair"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Link
                href="/admin/perfil"
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-lg flex-1 min-w-0 transition-colors',
                  isProfileActive ? 'bg-primary/10' : 'hover:bg-muted',
                )}
              >
                <Avatar className="w-7 h-7 shrink-0">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  {userName && <p className="text-xs font-medium truncate text-foreground">{userName}</p>}
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>
              </Link>
              <NotificationBell unreadCount={unreadCount} placement="sidebar" isAdmin />
              <ThemeToggle />
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-sm font-medium h-8"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Sair
              </button>
            </form>
            <p className="text-xs text-muted-foreground/40 font-mono text-center pt-1">v{APP_VERSION}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function AdminSidebar(props: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const pathname = usePathname()
  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  useEffect(() => {
    const stored = localStorage.getItem('admin_sidebar_collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('admin_sidebar_collapsed', String(next))
      return next
    })
  }

  return (
    <>
      {/* ── Mobile top bar ── */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-30 flex items-center gap-3 px-4 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {props.logoUrl ? (
          <Image src={props.logoUrl} alt={props.siteName} width={24} height={24} className="object-contain" />
        ) : (
          <GraduationCap className="w-5 h-5 text-primary" />
        )}
        <span className="text-sm font-semibold text-foreground truncate">{props.siteName}</span>
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell unreadCount={props.unreadCount ?? 0} placement="sidebar" isAdmin />
          <ThemeToggle />
        </div>
      </header>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile sidebar overlay ── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border md:hidden',
          'transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarContent {...props} onClose={() => setMobileOpen(false)} />
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden md:flex md:flex-col md:shrink-0 border-r border-border bg-card overflow-hidden"
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
