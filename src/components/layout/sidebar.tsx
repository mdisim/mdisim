'use client'

import { NavItem } from './nav-item'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  HardHat,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/projects', icon: FolderKanban, label: 'Projects' },
  { href: '/contractors', icon: Users, label: 'Contractors' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'bg-slate-900 flex flex-col transition-all duration-300 relative',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-slate-800', collapsed && 'justify-center px-2')}>
        <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center shrink-0">
          <HardHat size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">ANGEL D.C.</h1>
            <p className="text-slate-400 text-xs">Construction Management</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Collapse button */}
      <div className="px-2 py-4 border-t border-slate-800">
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
}
