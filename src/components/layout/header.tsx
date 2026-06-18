'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Bell, LogOut, User, Menu, Search } from 'lucide-react'
import { useState } from 'react'
import { useSidebar } from './sidebar-context'
import { cn } from '@/lib/utils'

interface HeaderProps {
  userEmail?: string | null
}

export function Header({ userEmail }: HeaderProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { setMobileOpen } = useSidebar()

  const handleSignOut = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 md:px-6 h-14 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="hidden sm:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5 w-64 text-sm text-slate-400 cursor-pointer hover:bg-slate-200/70 transition-colors">
          <Search size={14} />
          <span>Search...</span>
          <kbd className="ml-auto text-[10px] bg-white rounded px-1.5 py-0.5 border border-slate-200 text-slate-400 font-mono">⌘K</kbd>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 relative transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {(userEmail || 'U')[0].toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-700 leading-tight">{userEmail || 'User'}</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={loading}
            className={cn(
              'p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors',
              'disabled:opacity-50'
            )}
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
