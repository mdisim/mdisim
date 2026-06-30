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
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-[var(--radius-2xl)] bg-[var(--color-surface-hover)] flex items-center justify-center shadow-[var(--shadow-inner)]">
          <Icon size={32} className="text-[var(--color-text-muted)]" strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-1 -end-1 w-6 h-6 rounded-full bg-[var(--color-amber)]/15 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-[var(--color-amber)]" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--color-text-secondary)] max-w-md leading-relaxed mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="md">
          {actionLabel}
        </Button>
      )}
    </motion.div>
  )
}
