'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { logout } from '@/app/actions/auth'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Home, MessageSquare, FileText, Settings, GraduationCap, LogOut, Search, Menu, X, BookOpen,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_VERSION } from '@/lib/version'
import { NotificationBell } from '@/components/members/notification-bell'

type NavLabels = { home: string; community: string; documents: string; settings: string }

function parseNavLabels(json: string): NavLabels {
  try { return { home: 'Início', community: 'Comunidade', documents: 'Documentos', settings: 'Configurações', ...JSON.parse(json) } } catch {}
  return { home: 'Início', community: 'Comunidade', documents: 'Documentos', settings: 'Configurações' }
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
}

function SidebarContent({
  siteName, logoUrl, userName, userEmail, avatarUrl, unreadCount = 0,
  areaSubtitle = 'Área do Aluno', memberNavLabels = '',
  onClose, collapsed = false, onToggleCollapse,
}: Props & { onClose?: () => void; collapsed?: boolean; onToggleCollapse?: () => void }) {
  const pathname = usePathname()
  const labels = parseNavLabels(memberNavLabels)

  const NAV_ITEMS = [
    { href: '/dashboard',               label: labels.home,      icon: Home,          exact: true  },
    { href: '/dashboard/treinamentos',  label: 'Treinamentos',   icon: BookOpen,      exact: false },
    { href: '/dashboard/comunidade',    label: labels.community, icon: MessageSquare, exact: false },
    { href: '/dashboard/documentos',    label: labels.documents, icon: FileText,      exact: false },
    { href: '/dashboard/configuracoes', label: labels.settings,  icon: Settings,      exact: false },
  ]

  const initials = userName
    ? userName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : (userEmail[0]?.toUpperCase() ?? 'U')

  const isProfileActive = pathname === '/dashboard/perfil'

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Brand ── */}
      <div className={cn(
        'border-b border-border bg-primary/5 shrink-0',
        collapsed
          ? 'flex flex-col items-center py-3 px-1 gap-2'
          : 'flex items-center gap-3 px-4 py-5 justify-between',
      )}>
        <Link
          href="/dashboard"
          onClick={onClose}
          className={cn('flex items-center min-w-0', collapsed ? 'justify-center' : 'gap-3 flex-1')}
          title={collapsed ? siteName : undefined}
        >
          {logoUrl ? (
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-border shadow-sm">
              <Image src={logoUrl} alt={siteName} width={32} height={32} className="object-contain w-full h-full" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm">
              <GraduationCap className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate leading-tight">{siteName}</p>
              <p className="text-xs text-primary/70 font-medium">{areaSubtitle}</p>
            </div>
          )}
        </Link>

        {/* Mobile: close button | Desktop: collapse toggle */}
        {onClose ? (
          !collapsed && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          )
        ) : onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expandir menu' : 'Minimizar menu'}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {collapsed
              ? <PanelLeftOpen className="w-4 h-4" />
              : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className={cn('flex-1 py-3 space-y-0.5 overflow-y-auto', collapsed ? 'px-1.5' : 'px-2')}>

        {/* Search */}
        {collapsed ? (
          <button
            type="button"
            title="Busca rápida (Ctrl K)"
            className="w-full flex justify-center p-2.5 rounded-lg text-muted-foreground border border-dashed border-border hover:border-primary/30 hover:bg-muted/50 transition-all mb-1"
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
          >
            <Search className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground border border-dashed border-border hover:border-primary/30 hover:bg-muted/50 transition-all mb-1"
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 text-left">Busca rápida</span>
            <kbd className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono hidden md:inline">Ctrl K</kbd>
          </button>
        )}

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
                'flex items-center rounded-lg font-medium transition-all',
                collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 text-sm',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent',
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', isActive && 'text-primary')} />
              {!collapsed && label}
            </Link>
          )
        })}
      </nav>

      {/* ── User footer ── */}
      <div className={cn('py-3 border-t border-border space-y-1 shrink-0', collapsed ? 'px-1.5' : 'px-2')}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <Link
              href="/dashboard/perfil"
              title={userName || 'Perfil'}
              className={cn(
                'p-1 rounded-lg transition-colors',
                isProfileActive ? 'bg-primary/10' : 'hover:bg-muted'
              )}
            >
              <Avatar className="w-7 h-7">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
              </Avatar>
            </Link>
            <NotificationBell unreadCount={unreadCount} placement="sidebar" />
            <ThemeToggle />
            <form action={logout}>
              <button
                type="submit"
                title="Sair"
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <Link
                href="/dashboard/perfil"
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors flex-1 min-w-0',
                  isProfileActive ? 'bg-primary/10' : 'hover:bg-muted'
                )}
              >
                <Avatar className="w-7 h-7 shrink-0">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  {userName && <p className="text-xs font-medium truncate text-foreground">{userName}</p>}
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>
              </Link>
              <NotificationBell unreadCount={unreadCount} placement="sidebar" />
              <ThemeToggle />
            </div>
            <form action={logout}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </form>
            <p className="text-xs text-muted-foreground/40 font-mono text-center pt-1">v{APP_VERSION}</p>
          </>
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

  // Restore collapsed state from localStorage after mount
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
          <NotificationBell unreadCount={props.unreadCount ?? 0} placement="sidebar" />
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
          'fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transition-transform duration-300 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent {...props} onClose={() => setMobileOpen(false)} />
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          'hidden md:flex md:flex-col md:shrink-0 border-r border-border bg-card transition-all duration-300 ease-in-out overflow-hidden',
          collapsed ? 'md:w-[60px]' : 'md:w-60'
        )}
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
