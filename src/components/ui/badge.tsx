import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]',
    success: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
    warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
    danger: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]',
    info: 'bg-[var(--color-info-bg)] text-[var(--color-info)]',
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
