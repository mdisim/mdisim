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

const colorMap: Record<ColorVariant, { iconColor: string; iconBg: string; borderColor: string }> = {
  amber: { iconColor: 'text-amber-600', iconBg: 'bg-amber-50', borderColor: 'border-l-amber-500' },
  blue: { iconColor: 'text-blue-600', iconBg: 'bg-blue-50', borderColor: 'border-l-blue-500' },
  green: { iconColor: 'text-green-600', iconBg: 'bg-green-50', borderColor: 'border-l-green-500' },
  red: { iconColor: 'text-red-500', iconBg: 'bg-red-50', borderColor: 'border-l-red-500' },
  purple: { iconColor: 'text-purple-600', iconBg: 'bg-purple-50', borderColor: 'border-l-purple-500' },
  indigo: { iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50', borderColor: 'border-l-indigo-500' },
  orange: { iconColor: 'text-orange-600', iconBg: 'bg-orange-50', borderColor: 'border-l-orange-500' },
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
  const { iconColor, iconBg, borderColor } = color
    ? colorMap[color]
    : { iconColor: propIconColor || 'text-blue-600', iconBg: propIconBg || 'bg-blue-50', borderColor: 'border-l-blue-500' }
  return (
    <div className={cn('bg-white rounded-2xl border border-slate-200 border-l-[3px] p-5 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200', borderColor, className)}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon size={17} className={iconColor} />
        </div>
        {trend && (
          <span
            className={cn(
              'text-xs font-semibold px-2 py-1 rounded-lg ml-auto',
              trend.positive
                ? 'bg-green-50 text-green-600'
                : 'bg-red-50 text-red-600'
            )}
          >
            {trend.positive ? '+' : ''}{trend.value}% {trend.label}
          </span>
        )}
      </div>
      <p className="text-4xl font-extrabold text-slate-900 tabular-nums leading-none">{value}</p>
      <p className="text-sm text-slate-500 mt-1.5 font-medium">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  )
}
