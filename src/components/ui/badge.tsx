import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export function getStatusBadgeVariant(status: string): BadgeProps['variant'] {
  const map: Record<string, BadgeProps['variant']> = {
    planning: 'info',
    active: 'success',
    on_hold: 'warning',
    completed: 'default',
    pending: 'warning',
    approved: 'info',
    paid: 'success',
    completed_payment: 'success',
    cancelled: 'danger',
  }
  return map[status] || 'default'
}

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// StatusBadge is an alias for Badge used in project detail pages
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={getStatusBadgeVariant(status)}>
      {formatStatusLabel(status)}
    </Badge>
  )
}

export { Badge }
