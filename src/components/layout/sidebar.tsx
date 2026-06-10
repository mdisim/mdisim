'use client'

import { NavItem } from './nav-item'
import { useSidebar } from './sidebar-context'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  HardHat,
  ChevronLeft,
  ChevronRight,
  X,
  ClipboardList,
  BookOpen,
  BarChart3,
  Gavel,
  Calculator,
  GraduationCap,
  Map,
  Bell,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/projects', icon: FolderKanban, label: 'Projects' },
  { href: '/executive', icon: BarChart3, label: 'Executive' },
  { href: '/infrastructure', icon: Map, label: 'Infrastructure' },
  { href: '/tenders', icon: Gavel, label: 'Tenders' },
  { href: '/calculators', icon: Calculator, label: 'Calculators' },
  { href: '/boq-library', icon: BookOpen, label: 'BOQ Library' },
  { href: '/contractors', icon: Users, label: 'Contractors' },
  { href: '/learn', icon: GraduationCap, label: 'Learn' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar({ unreadNotifications = 0 }: { unreadNotifications?: number }) {
  const [collapsed, setCollapsed] = useState(false)
  const { mobileOpen, setMobileOpen } = useSidebar()

  const sidebarContent = (
    <aside
      className={cn(
        'bg-slate-900 flex flex-col transition-all duration-300 relative h-full',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-slate-800', collapsed && 'justify-center px-2')}>
        <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center shrink-0">
          <HardHat size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1">
            <h1 className="text-white font-bold text-sm leading-tight">ANGEL D.C.</h1>
            <p className="text-slate-400 text-xs">Construction Management</p>
          </div>
        )}
        {/* Close button on mobile */}
        {!collapsed && (
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 rounded text-slate-400 hover:text-white"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            collapsed={collapsed}
            onNavigate={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      {/* Notifications */}
      <div className="px-2 pb-2 border-t border-slate-800 pt-2">
        <NavItem
          href="/notifications"
          icon={Bell}
          label="Notifications"
          collapsed={collapsed}
          onNavigate={() => setMobileOpen(false)}
          badge={unreadNotifications > 0 ? unreadNotifications : undefined}
        />
      </div>

      {/* Collapse button (desktop only) */}
      <div className="hidden md:block px-2 py-4 border-t border-slate-800">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 w-full rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all text-sm',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <>
              <ChevronLeft size={16} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute left-0 top-0 h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
