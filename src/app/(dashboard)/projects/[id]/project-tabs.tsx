'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  Users,
  ClipboardList,
  Wrench,
  Image,
  FolderOpen,
} from 'lucide-react'

const tabs = [
  { segment: '', label: 'Overview', icon: LayoutDashboard },
  { segment: '/takeoff', label: 'Drawings', icon: Image },
  { segment: '/boq', label: 'BOQ', icon: FileText },
  { segment: '/rebar', label: 'Rebar', icon: Wrench },
  { segment: '/costs', label: 'Costs', icon: TrendingUp },
  { segment: '/contractors', label: 'Payments', icon: Users },
  { segment: '/reports', label: 'Reports', icon: ClipboardList },
  { segment: '/documents', label: 'Documents', icon: FolderOpen },
]

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  const base = `/projects/${projectId}`

  return (
    <div className="border-b border-slate-200 bg-white/80 backdrop-blur-md -mx-4 md:-mx-6 px-4 md:px-6 mb-8 sticky top-14 z-20">
      <nav className="flex gap-0.5 overflow-x-auto [-webkit-overflow-scrolling:touch] scrollbar-none">
        {tabs.map((tab) => {
          const href = `${base}${tab.segment}`
          const active = tab.segment === ''
            ? pathname === base
            : pathname.startsWith(href)

          return (
            <Link
              key={tab.segment}
              href={href}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all shrink-0 border-b-[3px] -mb-px',
                active
                  ? 'border-blue-600 text-blue-700 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              )}
            >
              <tab.icon size={16} strokeWidth={active ? 2.2 : 1.8} />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
