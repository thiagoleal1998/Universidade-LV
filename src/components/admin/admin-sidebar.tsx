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
  BookOpen, Users, LayoutDashboard, LogOut, Settings, GraduationCap,
  Megaphone, BarChart2, FileText, Presentation, MessageSquare,
  SearchCheck, HelpCircle, Menu, X,
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
}

function SidebarContent({
  siteName, logoUrl, userName, userEmail, avatarUrl, navOrder, unreadCount = 0, onClose,
}: Props & { onClose?: () => void }) {
  const pathname = usePathname()

  const sortedNavItems = navOrder && navOrder.length > 0
    ? [...NAV_ITEMS].sort((a, b) => {
        const ai = navOrder.indexOf(a.href)
        const bi = navOrder.indexOf(b.href)
        if (ai === -1 && bi === -1) return 0
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
    : NAV_ITEMS

  const initials = userName
    ? userName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : (userEmail[0]?.toUpperCase() ?? 'A')

  const isProfileActive = pathname === '/admin/perfil'

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-border flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-3 group" onClick={onClose}>
          {logoUrl ? (
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-border">
              <Image src={logoUrl} alt={siteName} width={32} height={32} className="object-contain w-full h-full" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">{siteName}</p>
            <p className="text-xs text-muted-foreground">Painel Admin</p>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 pb-2 py-3 space-y-0.5 overflow-y-auto">
        {sortedNavItems.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-2 py-3 border-t border-border space-y-1">
        <div className="flex items-center gap-1">
          <Link
            href="/admin/perfil"
            onClick={onClose}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors flex-1 min-w-0',
              isProfileActive ? 'bg-muted' : 'hover:bg-muted'
            )}
          >
            <Avatar className="w-7 h-7 flex-shrink-0">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
              <AvatarFallback className="text-xs bg-muted text-muted-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              {userName && <p className="text-xs font-medium truncate text-foreground">{userName}</p>}
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          </Link>
          <NotificationBell unreadCount={unreadCount} placement="sidebar" isAdmin />
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
      </div>
    </div>
  )
}

export function AdminSidebar(props: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const pathname = usePathname()
  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

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
          'fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transition-transform duration-300 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent {...props} onClose={() => setMobileOpen(false)} />
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:shrink-0 border-r border-border bg-card">
        <SidebarContent {...props} />
      </aside>
    </>
  )
}
