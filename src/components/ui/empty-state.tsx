'use client'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { Button } from './button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
  compact?: boolean
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className, compact }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-10 px-4' : 'py-20 px-6', className)}
    >
      <div className="relative mb-5">
        <div className={cn('rounded-[var(--radius-2xl)] bg-[var(--color-brand-tint)] flex items-center justify-center', compact ? 'w-14 h-14' : 'w-16 h-16')}>
          <Icon size={compact ? 22 : 26} className="text-[var(--color-brand)]" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className={cn('font-semibold text-[var(--color-text)] mb-1.5', compact ? 'text-[13px]' : 'text-base')}>{title}</h3>
      {description && (
        <p className={cn('text-[var(--color-text-muted)] max-w-sm leading-relaxed mb-5', compact ? 'text-[12px]' : 'text-[13px]')}>{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="md">
          {actionLabel}
        </Button>
      )}
    </motion.div>
  )
}
