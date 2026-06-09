import { ReportStatus, IssueSeverity, WorkStatus } from '@/lib/types'

const reportColors: Record<ReportStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
}

const severityColors: Record<IssueSeverity, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

const weatherIcons: Record<string, string> = {
  sunny: '☀️', partly_cloudy: '⛅', cloudy: '☁️',
  rainy: '🌧️', stormy: '⛈️', foggy: '🌫️',
}

const workStatusColors: Record<WorkStatus, string> = {
  normal: 'bg-green-100 text-green-700',
  delayed: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
  holiday: 'bg-blue-100 text-blue-700',
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${reportColors[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityColors[severity]}`}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  )
}

export function WeatherIcon({ weather }: { weather: string | null }) {
  if (!weather) return <span className="text-slate-400 text-sm">—</span>
  return <span title={weather}>{weatherIcons[weather] ?? '🌡️'}</span>
}

export function WorkStatusBadge({ status }: { status: WorkStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${workStatusColors[status]}`}>
      {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
    </span>
  )
}
