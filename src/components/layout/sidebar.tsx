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
  accountType?: string | null
}

export function Sidebar({ unreadNotifications = 0, userEmail, accountType }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { mobileOpen, setMobileOpen } = useSidebar()
  const { t } = useTranslation()

  // ── Student navigation ──────────────────────────────────────────────
  const studentNav = {
    learning: [
      { href: '/student', icon: LayoutDashboard, label: 'Learning Hub' },
      { href: '/student/courses', icon: BookOpen, label: 'Courses' },
      { href: '/student/boq-training', icon: ClipboardList, label: 'BOQ Training' },
      { href: '/student/measurement', icon: Map, label: 'Measurement Practice' },
    ],
    tools: [
      { href: '/calculators', icon: Calculator, label: t('calculators') },
      { href: '/student/rebar-practice', icon: BarChart3, label: 'Rebar Practice' },
    ],
    progress: [
      { href: '/student/progress', icon: GraduationCap, label: 'My Progress' },
      { href: '/settings', icon: Settings, label: t('settings') },
    ],
  }

  // ── Engineer navigation ─────────────────────────────────────────────
  const engineerNav = {
    projects: [
      { href: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
      { href: '/projects', icon: FolderKanban, label: t('projects') },
    ],
    tools: [
      { href: '/calculators', icon: Calculator, label: t('calculators') },
      { href: '/boq-library', icon: BookOpen, label: t('boq_library') },
    ],
    admin: [
      { href: '/settings', icon: Settings, label: t('settings') },
    ],
  }

  // ── Company navigation ──────────────────────────────────────────────
  const companyNav = {
    projects: [
      { href: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
      { href: '/projects', icon: FolderKanban, label: t('projects') },
    ],
    operations: [
      { href: '/tenders', icon: Gavel, label: t('tenders') },
      { href: '/contractors', icon: Users, label: t('contractors') },
      { href: '/team', icon: ClipboardList, label: t('team') },
    ],
    tools: [
      { href: '/calculators', icon: Calculator, label: t('calculators') },
      { href: '/boq-library', icon: BookOpen, label: t('boq_library') },
    ],
    admin: [
      { href: '/settings', icon: Settings, label: t('settings') },
    ],
  }

  // Default to company nav for backwards compatibility
  const projectsGroup = accountType === 'student' ? studentNav.learning : accountType === 'engineer' ? engineerNav.projects : companyNav.projects
  const operationsGroup = accountType === 'company' ? companyNav.operations : []
  const toolsGroup = accountType === 'student' ? studentNav.tools : accountType === 'engineer' ? engineerNav.tools : companyNav.tools
  const adminGroup = accountType === 'student' ? studentNav.progress : accountType === 'engineer' ? engineerNav.admin : companyNav.admin

  const sectionLabel = (label: string) =>
    collapsed ? (
      <div className="mx-3 my-3 h-px bg-white/10" />
    ) : (
      <p className="px-3 mb-1 mt-5 text-[11px] font-semibold uppercase tracking-widest text-slate-500 first:mt-0">
        {label}
      </p>
    )

  const sidebarContent = (
    <aside
      className={cn(
        'flex flex-col transition-all duration-300 ease-in-out relative h-full',
        'bg-[#0F172A]',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]',
          collapsed && 'justify-center px-2'
        )}
      >
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <HardHat size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-sm leading-tight tracking-wide">
              ANGEL D.C.
            </h1>
            <p className="text-blue-400 text-[11px] mt-0.5">
              Construction Management
            </p>
          </div>
        )}
        {/* Close button for tablet overlay */}
        {!collapsed && (
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 rounded text-white/40 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto scrollbar-thin">
        {sectionLabel(accountType === 'student' ? 'Learning' : 'Projects')}
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

        {operationsGroup.length > 0 && (
          <>
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
          </>
        )}

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

        {sectionLabel(accountType === 'student' ? 'Account' : 'Admin')}
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

      {/* Locale switcher */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-white/[0.06]">
          <LocaleSwitcher />
        </div>
      )}

      {/* User email with avatar */}
      {!collapsed && userEmail && (
        <div className="px-4 py-3 border-t border-white/[0.06] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center shrink-0">
            <span className="text-blue-400 text-xs font-semibold uppercase">
              {userEmail.charAt(0)}
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate">{userEmail}</p>
        </div>
      )}
      {collapsed && userEmail && (
        <div className="px-2 py-3 border-t border-white/[0.06] flex justify-center">
          <div
            className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center"
            title={userEmail}
          >
            <span className="text-blue-400 text-xs font-semibold uppercase">
              {userEmail.charAt(0)}
            </span>
          </div>
        </div>
      )}

      {/* Collapse button (desktop only) */}
      <div className="hidden md:block px-2 py-3 border-t border-white/[0.06]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 w-full rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all duration-200 text-sm',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? (
            <ChevronRight size={16} />
          ) : (
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
      {/* Desktop sidebar - visible on lg+ */}
      <div className="hidden lg:flex h-full no-print">{sidebarContent}</div>

      {/* Tablet/small-desktop overlay - visible on md to lg when mobileOpen */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden hidden md:block no-print">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute left-0 top-0 h-full shadow-2xl shadow-black/50 animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
