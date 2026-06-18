'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Ruler,
  TrendingUp,
  Users,
  ClipboardList,
  Wrench,
  ShoppingCart,
  BarChart2,
  Image,
} from 'lucide-react'

const tabs = [
  { segment: '', label: 'Overview', icon: LayoutDashboard },
  { segment: '/takeoff', label: 'Drawings', icon: Image },
  { segment: '/boq', label: 'BOQ', icon: FileText },
  { segment: '/rebar', label: 'Rebar', icon: Wrench },
  { segment: '/costs', label: 'Costs', icon: TrendingUp },
  { segment: '/contractors', label: 'Payments', icon: Users },
  { segment: '/reports', label: 'Reports', icon: ClipboardList },
]

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  const base = `/projects/${projectId}`

  return (
    <div className="border-b border-slate-200 bg-white -mx-4 md:-mx-6 px-4 md:px-6 mb-6 sticky top-14 z-20">
      <nav className="flex gap-1 overflow-x-auto [-webkit-overflow-scrolling:touch] scrollbar-none py-1">
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
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors shrink-0',
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              )}
            >
              <tab.icon size={15} />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
