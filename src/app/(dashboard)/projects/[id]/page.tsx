'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  ChevronRight,
  Sparkles,
  Shield,
  Target,
  TrendingUp,
  Loader2,
  RefreshCw,
  Zap,
  FileSpreadsheet,
  Ruler,
  DollarSign,
  ImageIcon,
  FileText,
  Receipt,
  GitCompare,
  Copy,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getProjectHealth } from '@/app/actions/ai-intelligence'
import type { HealthScore, HealthDimension, Alert, Recommendation, AlertSeverity } from '@/app/actions/ai-intelligence'
import { getProject } from '@/app/actions/projects'
import type { Project } from '@/lib/types'

const SEVERITY_STYLES: Record<AlertSeverity, { bg: string; border: string; icon: typeof AlertTriangle; iconColor: string; label: string }> = {
  critical: { bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-200 dark:border-red-800', icon: XCircle, iconColor: 'text-red-500', label: 'Critical' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-200 dark:border-amber-800', icon: AlertTriangle, iconColor: 'text-amber-500', label: 'Warning' },
  info: { bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-200 dark:border-blue-800', icon: Info, iconColor: 'text-blue-500', label: 'Info' },
}

const CATEGORY_ICONS: Record<string, typeof FileSpreadsheet> = {
  boq: FileSpreadsheet,
  quantity: Ruler,
  cost: DollarSign,
  drawing: ImageIcon,
  contract: FileText,
  payment: Receipt,
  schedule: TrendingUp,
  quality: CheckCircle2,
}

const DIMENSION_ICONS: Record<string, typeof Activity> = {
  'boq-completeness': FileSpreadsheet,
  'qty-accuracy': Ruler,
  'cost-risk': DollarSign,
  'missing-items': Layers,
  'duplicates': Copy,
  'drawing-consistency': ImageIcon,
  'contract-compliance': FileText,
  'progress': TrendingUp,
  'payment': Receipt,
  'revision-impact': GitCompare,
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth="8" fill="none" className="text-slate-200 dark:text-slate-700" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">{score}</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">/ 100</span>
      </div>
    </div>
  )
}

function DimensionBar({ dim }: { dim: HealthDimension }) {
  const pct = (dim.score / dim.maxScore) * 100
  const color = dim.status === 'good' ? 'bg-emerald-500' : dim.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
  const Icon = DIMENSION_ICONS[dim.id] ?? Activity

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-slate-400" />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{dim.label}</span>
        </div>
        <span className="text-xs font-mono text-slate-500">{dim.score}/{dim.maxScore}</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-1000', color)} style={{ width: `${pct}%` }} />
      </div>
      {dim.items.length > 0 && (
        <div className="mt-1 space-y-0.5 max-h-0 group-hover:max-h-40 overflow-hidden transition-all duration-200">
          {dim.items.map((item, i) => (
            <p key={i} className="text-[10px] text-slate-500 dark:text-slate-400 pl-6">• {item}</p>
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
    <div className={cn('flex items-start gap-3 p-3 rounded-lg border', style.bg, style.border)}>
      <style.icon size={18} className={cn(style.iconColor, 'shrink-0 mt-0.5')} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{alert.title}</span>
          <CatIcon size={12} className="text-slate-400" />
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{alert.description}</p>
        {alert.action && (
          <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium mt-1 flex items-center gap-1">
            <Zap size={10} /> {alert.action}
          </p>
        )}
        {alert.affectedItems && alert.affectedItems.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {alert.affectedItems.map((item, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 bg-white/60 dark:bg-slate-800/60 rounded text-slate-600 dark:text-slate-400 truncate max-w-[200px]">{item}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const priorityColor = rec.priority === 'high' ? 'border-l-red-500' : rec.priority === 'medium' ? 'border-l-amber-500' : 'border-l-blue-400'
  const effortLabel = rec.effort === 'quick' ? '⚡ Quick fix' : rec.effort === 'moderate' ? '🔧 Moderate' : '🏗️ Significant'

  return (
    <div className={cn('border border-slate-200 dark:border-slate-700 border-l-4 rounded-lg p-3', priorityColor)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{rec.title}</span>
            <span className={cn(
              'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
              rec.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                : rec.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
            )}>
              {rec.priority}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">{rec.description}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
            <span>Impact: {rec.impact}</span>
            <span>{effortLabel}</span>
          </div>
        </div>
        <ChevronRight size={16} className="text-slate-300 shrink-0 mt-1" />
      </div>
    </div>
  )
}

export default function ProjectIntelligencePage() {
  const params = useParams()
  const projectId = params.id as string
  const [health, setHealth] = useState<HealthScore | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [h, p] = await Promise.all([
      getProjectHealth(projectId),
      getProject(projectId),
    ])
    setHealth(h)
    setProject(p)
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-violet-200 dark:border-violet-800 border-t-violet-600 dark:border-t-violet-400 animate-spin" />
            <Activity size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-violet-600" />
          </div>
          <p className="text-sm text-slate-500">Analyzing project health...</p>
        </div>
      </div>
    )
  }

  if (!health || !project) return null

  const criticals = health.alerts.filter(a => a.severity === 'critical')
  const warnings = health.alerts.filter(a => a.severity === 'warning')
  const infos = health.alerts.filter(a => a.severity === 'info')
  const highRecs = health.recommendations.filter(r => r.priority === 'high')

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity size={20} className="text-violet-600" />
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Project Intelligence</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{project.name} — Real-time health analysis</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Top row: Score + Urgent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health Score */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4 self-start">
            <Shield size={16} className="text-violet-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Health Score</span>
          </div>
          <ScoreRing score={health.overall} />
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-3 max-w-[240px]">{health.summary}</p>
          <div className="flex items-center gap-4 mt-4 text-[10px]">
            <span className="flex items-center gap-1 text-red-500"><XCircle size={12} /> {criticals.length} critical</span>
            <span className="flex items-center gap-1 text-amber-500"><AlertTriangle size={12} /> {warnings.length} warning</span>
            <span className="flex items-center gap-1 text-blue-500"><Info size={12} /> {infos.length} info</span>
          </div>
        </div>

        {/* Today's Priorities */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-red-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Requires Attention Today</span>
          </div>
          {criticals.length === 0 && highRecs.length === 0 ? (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg">
              <CheckCircle2 size={24} className="text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">All clear</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">No critical issues require immediate attention.</p>
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

      {/* Dimension Scores */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-violet-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Health Dimensions</span>
          <span className="text-[10px] text-slate-400 ml-auto">Hover for details</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          {health.dimensions.map(dim => (
            <DimensionBar key={dim.id} dim={dim} />
          ))}
        </div>
      </div>

      {/* Alerts + Recommendations side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* All Alerts */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">All Alerts</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">{health.alerts.length}</span>
            </div>
          </div>
          {health.alerts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No alerts — everything looks good.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {health.alerts.map(alert => <AlertCard key={alert.id} alert={alert} />)}
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-violet-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recommendations</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">{health.recommendations.length}</span>
            </div>
          </div>
          {health.recommendations.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No recommendations — project is well-managed.</p>
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
