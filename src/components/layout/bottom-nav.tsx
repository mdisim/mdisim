'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  Settings,
  Menu,
  GraduationCap,
  BookOpen,
  Calculator,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from './sidebar-context'

const companyItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/projects', icon: FolderKanban, label: 'Projects' },
  { href: '/tenders', icon: ClipboardList, label: 'Tenders' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

const engineerItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/projects', icon: FolderKanban, label: 'Projects' },
  { href: '/calculators', icon: Calculator, label: 'Calc' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

const studentItems = [
  { href: '/student', icon: GraduationCap, label: 'Home' },
  { href: '/student/courses', icon: BookOpen, label: 'Courses' },
  { href: '/calculators', icon: Calculator, label: 'Calc' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

interface BottomNavProps {
  accountType?: string | null
}

export function BottomNav({ accountType }: BottomNavProps) {
  const pathname = usePathname()
  const { setMobileOpen } = useSidebar()

  const items = accountType === 'student' ? studentItems : accountType === 'engineer' ? engineerItems : companyItems

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 md:hidden safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors',
                active ? 'text-blue-600' : 'text-slate-400 active:text-slate-600'
              )}
            >
              <item.icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg text-slate-400 active:text-slate-600 transition-colors"
        >
          <Menu size={20} strokeWidth={1.5} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  )
}
