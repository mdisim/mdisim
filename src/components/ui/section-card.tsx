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

export function SectionCard({ title, icon: Icon, iconColor = 'text-blue-500', actions, children, className, noPadding, glass }: SectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative rounded-2xl overflow-hidden transition-all duration-300',
        glass
          ? 'glass-card hover:shadow-xl'
          : 'bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-lg',
        className
      )}
    >
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-blue-500/[0.02] via-transparent to-purple-500/[0.02]" />

      <div className="relative flex items-center justify-between px-5 py-3.5 border-b border-slate-100/80 dark:border-slate-700/40">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className={cn('p-1.5 rounded-lg bg-gradient-to-br transition-transform duration-300 group-hover:scale-105', iconColor.replace('text-', 'from-').replace('500', '500/15') + ' to-transparent')}>
              <Icon size={16} className={iconColor} />
            </div>
          )}
          <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 tracking-wide">{title}</h3>
        </div>
        {actions}
      </div>
      <div className={cn('relative', noPadding ? '' : 'p-5')}>
        {children}
      </div>
    </motion.div>
  )
}
