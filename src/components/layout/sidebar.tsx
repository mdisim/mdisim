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
import { useTranslation } from '@/lib/i18n/use-translation'
import { LocaleSwitcher } from '@/components/ui/locale-switcher'

interface SidebarProps {
  unreadNotifications?: number
  userEmail?: string
}

export function Sidebar({ unreadNotifications = 0, userEmail }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { mobileOpen, setMobileOpen } = useSidebar()
  const { t } = useTranslation()

  const projectsGroup = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
    { href: '/projects', icon: FolderKanban, label: t('projects') },
    { href: '/executive', icon: BarChart3, label: t('executive') },
  ]

  const operationsGroup = [
    { href: '/infrastructure', icon: Map, label: t('infrastructure') },
    { href: '/tenders', icon: Gavel, label: t('tenders') },
    { href: '/contractors', icon: Users, label: t('contractors') },
    { href: '/team', icon: ClipboardList, label: t('team') },
  ]

  const toolsGroup = [
    { href: '/calculators', icon: Calculator, label: t('calculators') },
    { href: '/boq-library', icon: BookOpen, label: t('boq_library') },
    { href: '/learn', icon: GraduationCap, label: t('learn') },
  ]

  const adminGroup = [
    { href: '/settings', icon: Settings, label: t('settings') },
  ]

  const sectionLabel = (label: string) =>
    !collapsed && (
      <p className="px-3 mb-1 mt-4 text-xs font-semibold uppercase tracking-widest text-white/30 first:mt-0">
        {label}
      </p>
    )

  const sidebarContent = (
    <aside
      className={cn(
        'flex flex-col transition-all duration-300 relative h-full',
        'bg-[#1e3a5f]',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-white/10',
        collapsed && 'justify-center px-2'
      )}>
        <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center shrink-0">
          <HardHat size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1">
            <h1 className="text-white font-bold text-sm leading-tight tracking-wide">ANGEL D.C.</h1>
            <p className="text-amber-400 text-xs mt-0.5">Construction Management</p>
          </div>
        )}
        {/* Close button on mobile */}
        {!collapsed && (
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 rounded text-white/50 hover:text-white"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        {sectionLabel('Projects')}
        <div className="space-y-0.5">
          {projectsGroup.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              collapsed={collapsed}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </div>

        {sectionLabel('Operations')}
        <div className="space-y-0.5">
          {operationsGroup.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              collapsed={collapsed}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </div>

        {sectionLabel('Tools')}
        <div className="space-y-0.5">
          {toolsGroup.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              collapsed={collapsed}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </div>

        {sectionLabel('Admin')}
        <div className="space-y-0.5">
          {adminGroup.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              collapsed={collapsed}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </div>
      </nav>

      {/* Notifications */}
      <div className="px-2 pb-2 border-t border-white/10 pt-2">
        <NavItem
          href="/notifications"
          icon={Bell}
          label="Notifications"
          collapsed={collapsed}
          onNavigate={() => setMobileOpen(false)}
          badge={unreadNotifications > 0 ? unreadNotifications : undefined}
        />
      </div>

      {/* Locale switcher */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-white/10">
          <LocaleSwitcher />
        </div>
      )}

      {/* User email */}
      {!collapsed && userEmail && (
        <div className="px-4 py-2 border-t border-white/10">
          <p className="text-xs text-white/40 truncate">{userEmail}</p>
        </div>
      )}

      {/* Collapse button (desktop only) */}
      <div className="hidden md:block px-2 py-3 border-t border-white/10">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 w-full rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-all text-sm',
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
      <div className="hidden md:flex h-full no-print">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden no-print">
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
