'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  Ruler,
  FileSpreadsheet,
  BookOpen,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  HardHat,
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/projects', icon: FolderKanban, label: 'Projects' },
  { href: '/takeoff', icon: Ruler, label: 'Quantity Takeoff', badge: 'Soon' },
  { href: '/boq-builder', icon: FileSpreadsheet, label: 'BOQ Builder', badge: 'Soon' },
  { href: '/library', icon: BookOpen, label: 'Rate Library', badge: 'Soon' },
  { href: '/reports', icon: BarChart3, label: 'Reports', badge: 'Soon' },
]

const BOTTOM_ITEMS = [
  { href: '/settings', icon: Settings, label: 'Settings', badge: 'Soon' },
]

interface AppSidebarProps {
  userEmail?: string
}

export function AppSidebar({ userEmail }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

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
        href={item.badge ? '#' : item.href}
        onClick={(e) => {
          if (item.badge) e.preventDefault()
          else setMobileOpen(false)
        }}
        className={cn(
          'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
          collapsed && 'justify-center px-2',
          isActive
            ? 'bg-blue-500/10 text-blue-400 border-l-[3px] border-blue-500 ml-0 pl-[9px]'
            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border-l-[3px] border-transparent ml-0 pl-[9px]',
          item.badge && !isActive && 'opacity-60 cursor-default'
        )}
      >
        <Icon size={18} className={cn(isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300')} />
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    )
  }

  const sidebar = (
    <aside
      className={cn(
        'flex flex-col h-full bg-[#0B1120] dark:bg-[#060A14] transition-all duration-300 ease-in-out border-r border-white/[0.06]',
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
            <p className="text-blue-400/70 text-[10px] font-medium mt-0.5 tracking-wide">Construction Intelligence</p>
          </div>
        )}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 rounded text-white/40 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
            Navigation
          </p>
        )}
        <div className="space-y-0.5">
          {NAV_ITEMS.map(renderNavItem)}
        </div>

        {/* Divider */}
        <div className="my-4 mx-3 border-t border-white/[0.06]" />

        {!collapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
            System
          </p>
        )}
        <div className="space-y-0.5">
          {BOTTOM_ITEMS.map(renderNavItem)}
        </div>
      </nav>

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
              title="Log out"
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
            title="Log out"
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
            'flex items-center gap-2 px-3 py-2 w-full rounded-lg text-slate-500 hover:bg-white/[0.04] hover:text-slate-300 transition-all text-xs',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 lg:hidden p-2.5 bg-[#0B1120] rounded-lg text-white shadow-lg shadow-black/20 border border-white/[0.06]"
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
          <div className="absolute left-0 top-0 h-full shadow-2xl shadow-black/50 animate-in slide-in-from-left duration-300">
            {sidebar}
          </div>
        </div>
      )}
    </>
  )
}
