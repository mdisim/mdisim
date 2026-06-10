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
  onNavigate?: () => void
  badge?: number
}

export function NavItem({ href, icon: Icon, label, collapsed, onNavigate, badge }: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-white/10 text-amber-400 border-l-4 border-amber-400 pl-2'
          : 'text-white/70 hover:bg-white/10 hover:text-white border-l-4 border-transparent',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? label : undefined}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span className="flex-1">{label}</span>}
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          'rounded-full bg-red-500 text-white text-xs font-bold leading-none flex items-center justify-center shrink-0',
          collapsed ? 'w-4 h-4 text-[9px]' : 'min-w-[18px] h-[18px] px-1'
        )}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}
