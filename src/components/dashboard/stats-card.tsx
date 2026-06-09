import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type ColorVariant = 'amber' | 'blue' | 'green' | 'red' | 'purple' | 'indigo' | 'orange'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  color?: ColorVariant
  className?: string
  trend?: {
    value: number
    label: string
    positive?: boolean
  }
}

const colorMap: Record<ColorVariant, { iconColor: string; iconBg: string }> = {
  amber: { iconColor: 'text-amber-600', iconBg: 'bg-amber-50' },
  blue: { iconColor: 'text-blue-600', iconBg: 'bg-blue-50' },
  green: { iconColor: 'text-green-600', iconBg: 'bg-green-50' },
  red: { iconColor: 'text-red-500', iconBg: 'bg-red-50' },
  purple: { iconColor: 'text-purple-600', iconBg: 'bg-purple-50' },
  indigo: { iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50' },
  orange: { iconColor: 'text-orange-600', iconBg: 'bg-orange-50' },
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor: propIconColor,
  iconBg: propIconBg,
  color,
  className,
  trend,
}: StatsCardProps) {
  const { iconColor, iconBg } = color
    ? colorMap[color]
    : { iconColor: propIconColor || 'text-amber-600', iconBg: propIconBg || 'bg-amber-50' }
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm p-5', className)}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2.5 rounded-lg', iconBg)}>
          <Icon size={20} className={iconColor} />
        </div>
        {trend && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-full',
              trend.positive
                ? 'bg-green-50 text-green-600'
                : 'bg-red-50 text-red-600'
            )}
          >
            {trend.positive ? '+' : ''}{trend.value}% {trend.label}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 mb-0.5">{value}</p>
      <p className="text-sm text-slate-500">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  )
}
