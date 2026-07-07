'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'
import { ScaleMark } from '@/components/icons/marks'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' as const },
  { href: '/projects', icon: FolderKanban, labelKey: 'projects' as const },
]

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'AR' },
  { code: 'he', label: 'HE' },
]

interface AppSidebarProps {
  userEmail?: string
}

export function AppSidebar({ userEmail }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t, locale, setLocale } = useI18n()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const renderNavItem = (item: typeof NAV_ITEMS[0]) => {
    const Icon = item.icon
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'group relative flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-all duration-200',
          collapsed && 'justify-center px-2',
          isActive
            ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand)] border-s-[3px] border-[var(--color-brand)] ms-0 ps-[9px] font-semibold'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] border-s-[3px] border-transparent ms-0 ps-[9px]'
        )}
      >
        <Icon size={18} className={cn(isActive ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]')} />
        {!collapsed && <span className="flex-1">{t.nav[item.labelKey]}</span>}
      </Link>
    )
  }

  const sidebar = (
    <aside
      className={cn(
        'flex flex-col h-full bg-[var(--color-surface)] transition-all duration-300 ease-in-out border-e border-[var(--color-border)]',
        collapsed ? 'w-[68px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-[var(--color-border)]', collapsed && 'justify-center px-2')}>
        <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-brand-tint)] flex items-center justify-center shrink-0">
          <ScaleMark size={16} className="text-[var(--color-brand)]" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <span className="text-[var(--foreground)] font-bold text-[13px] tracking-tight leading-none block">Angel D.C.</span>
          </div>
        )}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-3 min-h-11 min-w-11 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          aria-label={t.sidebar.closeMenu}
          title={t.sidebar.closeMenu}
        >
          <X size={18} />
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
            {t.sidebar.navigation}
          </p>
        )}
        <div className="space-y-0.5">
          {NAV_ITEMS.map(renderNavItem)}
        </div>

      </nav>

      {/* Language switcher */}
      <div className={cn(
        'px-3 py-2 border-t border-[var(--color-border)] flex items-center gap-1',
        collapsed ? 'px-2 flex-col' : 'justify-center'
      )}>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            className={cn(
              'px-2 py-1 rounded text-[10px] font-bold tracking-wide transition-all',
              locale === lang.code
                ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand)] border border-[var(--color-brand)]/30'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] border border-transparent'
            )}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* User area */}
      <div className={cn(
        'px-3 py-3 border-t border-[var(--color-border)]',
        collapsed && 'px-2'
      )}>
        {!collapsed && userEmail ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-brand-tint)] border border-[var(--color-brand)]/30 flex items-center justify-center shrink-0">
              <span className="text-[var(--color-brand)] text-xs font-bold uppercase">
                {userEmail.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--color-text-secondary)] truncate">{userEmail}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-tint)] transition-all"
              title={t.sidebar.logOut}
              aria-label={t.sidebar.logOut}
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center justify-center w-full p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-tint)] transition-all',
            )}
            title={t.sidebar.logOut}
            aria-label={t.sidebar.logOut}
          >
            <LogOut size={16} />
          </button>
        )}
      </div>

      {/* Collapse toggle - desktop only */}
      <div className="hidden lg:block px-2 py-2 border-t border-[var(--color-border)]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 min-h-11 min-w-11 w-full rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-secondary)] transition-all text-xs',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>{t.sidebar.collapse}</span></>}
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 start-4 z-40 lg:hidden p-3 min-h-11 min-w-11 bg-[var(--color-surface-elevated)] rounded-[var(--radius-md)] text-[var(--color-text)] shadow-[var(--shadow-lg)] border border-[var(--color-border)]"
        aria-label={t.sidebar.navigation}
        title={t.sidebar.navigation}
      >
        <Menu size={20} />
      </button>

      {/* Desktop */}
      <div className="hidden lg:flex h-full">{sidebar}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute start-0 top-0 h-full shadow-2xl shadow-black/50 animate-in slide-in-from-left duration-300 rtl:slide-in-from-right">
            {sidebar}
          </div>
        </div>
      )}
    </>
  )
}
