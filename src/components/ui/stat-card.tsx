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
  glass?: boolean
}

export function StatCard({ label, value, prefix = '', suffix = '', decimals = 0, icon: Icon, trend, trendLabel, gradient, className, compact, glass }: StatCardProps) {
  const nodeRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const node = nodeRef.current
    if (!node) return
    const controls = animate(0, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
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
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={cn(
        'group relative rounded-2xl overflow-hidden transition-shadow duration-300',
        glass
          ? 'glass-card hover:shadow-xl'
          : 'bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-xl',
        compact ? 'p-4' : 'p-5',
        className
      )}
    >
      {/* Gradient accent */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r transition-all duration-300',
        'opacity-60 group-hover:opacity-100 group-hover:h-[3px]',
        gradient
      )} />

      {/* Background glow on hover */}
      <div className={cn(
        'absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500 blur-2xl',
        gradient
      )} />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className={cn(
            'p-2 rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110',
            gradient
          )}>
            <Icon size={compact ? 15 : 18} />
          </div>
          {trend !== undefined && (
            <div className={cn(
              'flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full',
              trend > 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : trend < 0 ? 'bg-red-50 dark:bg-red-500/10' : 'bg-slate-50 dark:bg-slate-700/50',
              trendColor
            )}>
              <TrendIcon size={10} />
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>

        <div className={cn(
          'font-bold text-slate-900 dark:text-white tabular-nums tracking-tight',
          compact ? 'text-xl' : 'text-[26px] leading-none'
        )}>
          <span ref={nodeRef}>{prefix}0{suffix}</span>
        </div>

        <div className="flex items-center justify-between mt-1.5">
          <span className={cn(
            'font-medium text-slate-500 dark:text-slate-400 tracking-wide',
            compact ? 'text-[10px]' : 'text-[11px]'
          )}>
            {label}
          </span>
          {trendLabel && (
            <span className="text-[9px] text-slate-400 dark:text-slate-500">{trendLabel}</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
