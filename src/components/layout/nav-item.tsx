'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'

interface NavItemProps {
  href: string
  icon: LucideIcon
  label: string
  collapsed?: boolean
}

export function NavItem({ href, icon: Icon, label, collapsed }: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-amber-500 text-white shadow-sm'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? label : undefined}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}
