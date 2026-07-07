'use client'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  gradient: string
  badge?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ icon: Icon, title, subtitle, gradient, badge, actions, className }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8', className)}
    >
      <div className="flex items-center gap-4">
        <div className={cn('p-3 rounded-xl bg-gradient-to-br shadow-lg', gradient)}>
          <Icon size={22} className="text-white" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-bold text-[var(--foreground)] tracking-[-0.02em] leading-tight">{title}</h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap">
          {actions}
        </div>
      )}
    </motion.div>
  )
}
