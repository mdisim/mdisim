'use client'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './button'

/** The one error surface used everywhere something failed to load — same shape as EmptyState, danger-toned, always offers the way back. */
export function ErrorState({
  message, onRetry, compact, className,
}: { message: string; onRetry?: () => void; compact?: boolean; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-10 px-4' : 'py-20 px-6', className)}
    >
      <div className={cn('rounded-[var(--radius-2xl)] bg-[var(--color-danger-tint)] flex items-center justify-center mb-5', compact ? 'w-14 h-14' : 'w-16 h-16')}>
        <AlertTriangle size={compact ? 22 : 26} className="text-[var(--color-danger)]" strokeWidth={1.5} />
      </div>
      <p className={cn('text-[var(--color-text)] font-medium max-w-sm leading-relaxed mb-5', compact ? 'text-[12.5px]' : 'text-[13.5px]')}>{message}</p>
      {onRetry && (
        <Button onClick={onRetry} size="md" variant="secondary">
          <RefreshCw size={13} /> Retry
        </Button>
      )}
    </motion.div>
  )
}
