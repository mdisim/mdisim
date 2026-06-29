'use client'
import { cn } from '@/lib/utils'
import { motion, animate } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  icon: LucideIcon
  trend?: number
  trendLabel?: string
  gradient: string
  className?: string
  compact?: boolean
}

export function StatCard({ label, value, prefix = '', suffix = '', decimals = 0, icon: Icon, trend, trendLabel, gradient, className, compact }: StatCardProps) {
  const nodeRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const node = nodeRef.current
    if (!node) return
    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.25, 0.1, 0.25, 1],
      onUpdate(v) {
        node.textContent = prefix + v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix
      },
    })
    return () => controls.stop()
  }, [value, prefix, suffix, decimals])

  const trendColor = trend && trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : trend && trend < 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-400'
  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        'group relative bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80',
        'shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden',
        compact ? 'p-4' : 'p-5',
        className
      )}
    >
      {/* Subtle gradient accent at top */}
      <div className={cn('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r opacity-80 group-hover:opacity-100 transition-opacity', gradient)} />

      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2.5 rounded-xl bg-gradient-to-br text-white shadow-lg', gradient)}>
          <Icon size={compact ? 16 : 20} />
        </div>
        {trend !== undefined && (
          <div className={cn('flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-slate-50 dark:bg-slate-700/50', trendColor)}>
            <TrendIcon size={12} />
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className={cn('font-bold text-slate-900 dark:text-white tabular-nums', compact ? 'text-xl' : 'text-2xl')}>
        <span ref={nodeRef}>{prefix}0{suffix}</span>
      </div>

      <div className="flex items-center justify-between mt-1">
        <span className={cn('font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider', compact ? 'text-[10px]' : 'text-xs')}>
          {label}
        </span>
        {trendLabel && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{trendLabel}</span>
        )}
      </div>
    </motion.div>
  )
}
