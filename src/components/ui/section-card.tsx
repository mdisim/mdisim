'use client'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  icon?: LucideIcon
  iconColor?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  noPadding?: boolean
  glass?: boolean
}

export function SectionCard({ title, icon: Icon, iconColor = 'text-[var(--color-amber)]', actions, children, className, noPadding, glass }: SectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative rounded-[var(--radius-lg)] overflow-hidden transition-all duration-300 border',
        glass
          ? 'glass-card hover:shadow-[var(--shadow-xl)]'
          : 'bg-[var(--color-surface-elevated)] border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-lg)]',
        className
      )}
    >
      <div className="absolute inset-0 rounded-[var(--radius-lg)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-[var(--color-amber)]/[0.03] via-transparent to-transparent" />

      <div className="relative flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--color-amber)]/10 transition-transform duration-300 group-hover:scale-105">
              <Icon size={16} className={iconColor} />
            </div>
          )}
          <h3 className="text-[13px] font-semibold text-[var(--color-text)] tracking-wide">{title}</h3>
        </div>
        {actions}
      </div>
      <div className={cn('relative', noPadding ? '' : 'p-5')}>
        {children}
      </div>
    </motion.div>
  )
}
