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
}

export function SectionCard({ title, icon: Icon, iconColor = 'text-blue-500', actions, children, className, noPadding }: SectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        'bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden',
        className
      )}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/80">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon size={18} className={iconColor} />}
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-wide uppercase">{title}</h3>
        </div>
        {actions}
      </div>
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </motion.div>
  )
}
