'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  FolderKanban,
  HardHat,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/projects', icon: FolderKanban, label: 'Projects' },
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

  const sidebar = (
    <aside
      className={cn(
        'flex flex-col h-full bg-[#0F172A] transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]', collapsed && 'justify-center px-2')}>
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <HardHat size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-sm tracking-wide">ANGEL D.C.</h1>
            <p className="text-blue-400 text-[11px] mt-0.5">Measurement &amp; BOQ</p>
          </div>
        )}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 rounded text-white/40 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Workspace
          </p>
        )}
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                  collapsed && 'justify-center',
                  isActive
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon size={18} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </div>
      </nav>

      {!collapsed && userEmail && (
        <div className="px-4 py-3 border-t border-white/[0.06] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center shrink-0">
            <span className="text-blue-400 text-xs font-semibold uppercase">
              {userEmail.charAt(0)}
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate flex-1">{userEmail}</p>
          <button onClick={handleLogout} className="p-1 text-slate-500 hover:text-red-400 transition-colors" title="Log out">
            <LogOut size={14} />
          </button>
        </div>
      )}

      <div className="hidden md:block px-2 py-3 border-t border-white/[0.06]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 w-full rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all text-sm',
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
        className="fixed top-4 left-4 z-40 lg:hidden p-2 bg-[#0F172A] rounded-lg text-white shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Desktop */}
      <div className="hidden lg:flex h-full">{sidebar}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full shadow-2xl">{sidebar}</div>
        </div>
      )}
    </>
  )
}
