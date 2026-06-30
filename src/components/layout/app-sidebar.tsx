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
  HardHat,
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'

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
          'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
          collapsed && 'justify-center px-2',
          isActive
            ? 'bg-blue-500/10 text-blue-400 border-s-[3px] border-blue-500 ms-0 ps-[9px]'
            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border-s-[3px] border-transparent ms-0 ps-[9px]'
        )}
      >
        <Icon size={18} className={cn(isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300')} />
        {!collapsed && <span className="flex-1">{t.nav[item.labelKey]}</span>}
      </Link>
    )
  }

  const sidebar = (
    <aside
      className={cn(
        'flex flex-col h-full bg-[var(--color-navy)] dark:bg-[var(--color-surface-sunken)] transition-all duration-300 ease-in-out border-r border-white/[0.06]',
        collapsed ? 'w-[68px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]', collapsed && 'justify-center px-2')}>
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
          <HardHat size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-sm tracking-widest">ANGEL D.C.</h1>
            <p className="text-blue-400/70 text-[10px] font-medium mt-0.5 tracking-wide">{t.sidebar.tagline}</p>
          </div>
        )}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-3 min-h-11 min-w-11 rounded text-white/40 hover:text-white transition-colors"
          aria-label={t.sidebar.closeMenu}
          title={t.sidebar.closeMenu}
        >
          <X size={18} />
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
            {t.sidebar.navigation}
          </p>
        )}
        <div className="space-y-0.5">
          {NAV_ITEMS.map(renderNavItem)}
        </div>

      </nav>

      {/* Language switcher */}
      <div className={cn(
        'px-3 py-2 border-t border-white/[0.06] flex items-center gap-1',
        collapsed ? 'px-2 flex-col' : 'justify-center'
      )}>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            className={cn(
              'px-2 py-1 rounded text-[10px] font-bold tracking-wide transition-all',
              locale === lang.code
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] border border-transparent'
            )}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* User area */}
      <div className={cn(
        'px-3 py-3 border-t border-white/[0.06]',
        collapsed && 'px-2'
      )}>
        {!collapsed && userEmail ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
              <span className="text-blue-400 text-xs font-bold uppercase">
                {userEmail.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 truncate">{userEmail}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
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
              'flex items-center justify-center w-full p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all',
            )}
            title={t.sidebar.logOut}
            aria-label={t.sidebar.logOut}
          >
            <LogOut size={16} />
          </button>
        )}
      </div>

      {/* Collapse toggle - desktop only */}
      <div className="hidden lg:block px-2 py-2 border-t border-white/[0.06]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 min-h-11 min-w-11 w-full rounded-lg text-slate-500 hover:bg-white/[0.04] hover:text-slate-300 transition-all text-xs',
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
        className="fixed top-4 start-4 z-40 lg:hidden p-3 min-h-11 min-w-11 bg-[var(--color-navy)] dark:bg-[var(--color-surface-sunken)] rounded-lg text-white shadow-lg shadow-black/20 border border-white/[0.06]"
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
