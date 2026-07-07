'use client'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface DonutChartProps {
  segments: { value: number; color: string; label: string }[]
  size?: number
  strokeWidth?: number
  className?: string
  showLegend?: boolean
}

export function DonutChart({ segments, size = 160, strokeWidth = 24, className, showLegend = true }: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return null
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className={cn('flex items-center gap-6', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-[var(--color-surface-hover)]" />
        {segments.map((seg, i) => {
          const pct = seg.value / total
          const dashArray = pct * circumference
          const dashOffset = -offset * circumference
          offset += pct
          return (
            <motion.circle
              key={i}
              cx={size/2}
              cy={size/2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashArray} ${circumference - dashArray}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: i * 0.15, ease: 'easeOut' }}
            />
          )
        })}
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" className="fill-[var(--color-text)] text-lg font-bold rotate-90" style={{ transformOrigin: 'center' }}>
          {total.toLocaleString()}
        </text>
      </svg>
      {showLegend && (
        <div className="space-y-2">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-[var(--color-text-secondary)] whitespace-nowrap">{seg.label}</span>
              <span className="ms-auto font-semibold tabular-nums text-[var(--color-text)]">{seg.value.toLocaleString()}</span>
              <span className="text-xs text-[var(--color-text-muted)]">({(seg.value/total*100).toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface BarChartProps {
  bars: { label: string; value: number; color: string }[]
  maxValue?: number
  className?: string
  horizontal?: boolean
}

export function SimpleBarChart({ bars, maxValue, className, horizontal = true }: BarChartProps) {
  const max = maxValue ?? Math.max(...bars.map(b => b.value), 1)

  if (horizontal) {
    return (
      <div className={cn('space-y-3', className)}>
        {bars.map((bar, i) => (
          <div key={i}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-[var(--color-text-secondary)]">{bar.label}</span>
              <span className="text-sm font-semibold tabular-nums text-[var(--color-text)]">{bar.value.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-[var(--color-surface-hover)] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: bar.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(bar.value / max) * 100}%` }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Vertical bars
  return (
    <div className={cn('flex items-end justify-around gap-2 h-40', className)}>
      {bars.map((bar, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-xs font-semibold tabular-nums text-[var(--color-text-secondary)]">{bar.value.toLocaleString()}</span>
          <motion.div
            className="w-full max-w-12 rounded-t-lg"
            style={{ backgroundColor: bar.color }}
            initial={{ height: 0 }}
            animate={{ height: `${(bar.value / max) * 100}%` }}
            transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
          />
          <span className="text-[10px] text-[var(--color-text-muted)] text-center truncate w-full">{bar.label}</span>
        </div>
      ))}
    </div>
  )
}

interface ProgressRingProps {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
  className?: string
}

export function ProgressRing({ value, size = 80, strokeWidth = 8, color = 'var(--color-brand)', label, className }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(Math.max(value, 0), 100)

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-[var(--color-surface-hover)]" />
        <motion.circle
          cx={size/2} cy={size/2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct / 100) }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-[var(--color-text)]">{pct.toFixed(0)}%</span>
        {label && <span className="text-[9px] text-[var(--color-text-secondary)] uppercase tracking-wider">{label}</span>}
      </div>
    </div>
  )
}
