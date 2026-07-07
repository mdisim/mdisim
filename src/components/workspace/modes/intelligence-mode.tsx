'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Activity, AlertTriangle, CheckCircle2, XCircle, Info, ChevronRight,
  Wrench, Building2, Sparkles, Target, TrendingUp, RefreshCw, Zap,
  FileSpreadsheet, Ruler, DollarSign, ImageIcon, FileText, Receipt, GitCompare, Copy, Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getProjectHealth } from '@/app/actions/ai-intelligence'
import type { HealthScore, HealthDimension, Alert, Recommendation, AlertSeverity } from '@/app/actions/ai-intelligence'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'

const SEVERITY_STYLES: Record<AlertSeverity, { icon: typeof AlertTriangle; color: string; bg: string; label: string }> = {
  critical: { icon: XCircle, color: 'text-[var(--color-danger)]', bg: 'bg-[var(--color-danger-tint)]', label: 'Critical' },
  warning: { icon: AlertTriangle, color: 'text-[var(--color-warning)]', bg: 'bg-[var(--color-warning-tint)]', label: 'Warning' },
  info: { icon: Info, color: 'text-[var(--color-info)]', bg: 'bg-[var(--color-info-tint)]', label: 'Info' },
}

const CATEGORY_ICONS: Record<string, typeof FileSpreadsheet> = {
  boq: FileSpreadsheet, quantity: Ruler, cost: DollarSign, drawing: ImageIcon,
  contract: FileText, payment: Receipt, schedule: TrendingUp, quality: CheckCircle2,
}

const DIMENSION_ICONS: Record<string, typeof Activity> = {
  'boq-completeness': FileSpreadsheet, 'qty-accuracy': Ruler, 'cost-risk': DollarSign,
  'missing-items': Layers, duplicates: Copy, 'drawing-consistency': ImageIcon,
  'contract-compliance': FileText, progress: TrendingUp, payment: Receipt, 'revision-impact': GitCompare,
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? 'var(--color-success)' : score >= 60 ? 'var(--color-warning)' : 'var(--color-danger)'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth="8" fill="none" className="text-[var(--color-surface-elevated)]" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-[var(--color-text)]">{score}</span>
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">/ 100</span>
      </div>
    </div>
  )
}

function DimensionBar({ dim }: { dim: HealthDimension }) {
  const pct = (dim.score / dim.maxScore) * 100
  const color = dim.status === 'good' ? 'var(--color-success)' : dim.status === 'warning' ? 'var(--color-warning)' : 'var(--color-danger)'
  const Icon = DIMENSION_ICONS[dim.id] ?? Activity

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-[var(--color-text-muted)]" />
          <span className="text-xs font-medium text-[var(--color-text)]">{dim.label}</span>
        </div>
        <span className="text-xs font-mono text-[var(--color-text-muted)]">{dim.score}/{dim.maxScore}</span>
      </div>
      <div className="h-1.5 bg-[var(--color-surface-elevated)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ backgroundColor: color, width: `${pct}%` }} />
      </div>
      {dim.items.length > 0 && (
        <div className="mt-1 space-y-0.5 max-h-0 group-hover:max-h-40 overflow-hidden transition-all duration-200">
          {dim.items.map((item, i) => (
            <p key={i} className="text-[10px] text-[var(--color-text-muted)] ps-6">• {item}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function AlertCard({ alert }: { alert: Alert }) {
  const style = SEVERITY_STYLES[alert.severity]
  const CatIcon = CATEGORY_ICONS[alert.category] ?? Info
  return (
    <div className={cn('flex items-start gap-3 p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)]', style.bg)}>
      <style.icon size={18} className={cn(style.color, 'shrink-0 mt-0.5')} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-[var(--color-text)]">{alert.title}</span>
          <CatIcon size={12} className="text-[var(--color-text-muted)]" />
        </div>
        <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">{alert.description}</p>
        {alert.action && (
          <p className="text-[10px] text-[var(--color-brand)] font-medium mt-1 flex items-center gap-1">
            <Zap size={10} /> {alert.action}
          </p>
        )}
        {alert.affectedItems && alert.affectedItems.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {alert.affectedItems.map((item, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 bg-[var(--color-surface-elevated)] rounded text-[var(--color-text-muted)] truncate max-w-[200px]">{item}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const priorityColor = rec.priority === 'high' ? 'var(--color-danger)' : rec.priority === 'medium' ? 'var(--color-warning)' : 'var(--color-info)'
  const EffortIcon = rec.effort === 'quick' ? Zap : rec.effort === 'moderate' ? Wrench : Building2
  const effortLabel = rec.effort === 'quick' ? 'Quick' : rec.effort === 'moderate' ? 'Moderate' : 'Significant'

  return (
    <div className={cn('border border-[var(--color-border)] rounded-[var(--radius-lg)] p-3 border-s-4')} style={{ borderInlineStartColor: priorityColor }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold text-[var(--color-text)]">{rec.title}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${priorityColor}18`, color: priorityColor }}>
              {rec.priority}
            </span>
          </div>
          <p className="text-[11px] text-[var(--color-text-secondary)]">{rec.description}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--color-text-muted)]">
            <span>Impact: {rec.impact}</span>
            <span className="flex items-center gap-1"><EffortIcon size={10} /> {effortLabel}</span>
          </div>
        </div>
        <ChevronRight size={16} className="text-[var(--color-text-muted)] shrink-0 mt-1" />
      </div>
    </div>
  )
}

export function IntelligenceMode({ projectId }: { projectId: string }) {
  const [health, setHealth] = useState<HealthScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setHealth(await getProjectHealth(projectId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load health data')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-6 space-y-4 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-48 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)]" />
          <div className="h-48 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] lg:col-span-2" />
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="flex items-center justify-center h-full"><ErrorState message={error} onRetry={load} /></div>
  }

  if (!health) {
    return <EmptyState icon={Activity} title="No health data yet" description="Health analysis needs BOQ items, measurements, or drawings to evaluate." />
  }

  const criticals = health.alerts.filter(a => a.severity === 'critical')
  const warnings = health.alerts.filter(a => a.severity === 'warning')
  const infos = health.alerts.filter(a => a.severity === 'info')
  const highRecs = health.recommendations.filter(r => r.priority === 'high')

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-end">
        <button
          onClick={load}
          disabled={loading}
          title="Refresh health analysis"
          aria-label="Refresh health analysis"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)] hover:border-[var(--color-brand)]/40 transition-all"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 flex flex-col items-center">
          <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">Health score</span>
          <ScoreRing score={health.overall} />
          <p className="text-xs text-[var(--color-text-muted)] text-center mt-3 max-w-[240px]">{health.summary}</p>
          <div className="flex items-center gap-4 mt-4 text-[10px]">
            <span className="flex items-center gap-1 text-[var(--color-danger)]"><XCircle size={12} /> {criticals.length} critical</span>
            <span className="flex items-center gap-1 text-[var(--color-warning)]"><AlertTriangle size={12} /> {warnings.length} warning</span>
            <span className="flex items-center gap-1 text-[var(--color-info)]"><Info size={12} /> {infos.length} info</span>
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Target size={15} className="text-[var(--color-danger)]" />
            <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Requires attention today</span>
          </div>
          {criticals.length === 0 && highRecs.length === 0 ? (
            <div className="flex items-center gap-3 p-4 bg-[var(--color-success-tint)] border border-[var(--color-success)]/20 rounded-[var(--radius-lg)]">
              <CheckCircle2 size={24} className="text-[var(--color-success)]" />
              <div>
                <p className="text-sm font-medium text-[var(--color-success)]">All clear</p>
                <p className="text-xs text-[var(--color-text-muted)]">No critical issues right now.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {criticals.map(alert => <AlertCard key={alert.id} alert={alert} />)}
              {highRecs.map(rec => <RecommendationCard key={rec.id} rec={rec} />)}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-[var(--color-brand)]" />
            <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Health dimensions</span>
          </div>
          <span className="text-[10px] text-[var(--color-text-muted)]">Hover a row for detail</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {health.dimensions.map(dim => <DimensionBar key={dim.id} dim={dim} />)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-[var(--color-warning)]" />
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">All alerts</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-muted)]">{health.alerts.length}</span>
          </div>
          {health.alerts.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No alerts" description="Everything looks good." compact />
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {health.alerts.map(alert => <AlertCard key={alert.id} alert={alert} />)}
            </div>
          )}
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-[var(--color-brand)]" />
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Recommendations</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-text-muted)]">{health.recommendations.length}</span>
          </div>
          {health.recommendations.length === 0 ? (
            <EmptyState icon={Sparkles} title="No recommendations" description="Project is well managed." compact />
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {health.recommendations.map(rec => <RecommendationCard key={rec.id} rec={rec} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
