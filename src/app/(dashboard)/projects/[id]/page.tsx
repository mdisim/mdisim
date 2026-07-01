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
  Wrench,
  Building2,
  Sparkles,
  Shield,
  Target,
  TrendingUp,
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
import { motion, type Variants } from 'framer-motion'
import { cn } from '@/lib/utils'
import { getProjectHealth } from '@/app/actions/ai-intelligence'
import type { HealthScore, HealthDimension, Alert, Recommendation, AlertSeverity } from '@/app/actions/ai-intelligence'
import { getProject } from '@/app/actions/projects'
import type { Project } from '@/lib/types'
import type { TranslationKeys } from '@/lib/i18n/translations'
import { SectionCard } from '@/components/ui/section-card'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { CardSkeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'

const SEVERITY_STYLES: Record<AlertSeverity, { bg: string; border: string; icon: typeof AlertTriangle; iconColor: string; label: string }> = {
  critical: { bg: 'bg-[var(--color-danger-bg)]/5', border: 'border-[var(--color-danger)]/20', icon: XCircle, iconColor: 'text-[var(--color-danger-light)]', label: 'Critical' },
  warning: { bg: 'bg-[var(--color-amber)]/5', border: 'border-[var(--color-amber)]/20', icon: AlertTriangle, iconColor: 'text-[var(--color-amber)]', label: 'Warning' },
  info: { bg: 'bg-[var(--color-info-bg)]', border: 'border-[var(--color-info)]/20', icon: Info, iconColor: 'text-[var(--color-info-light)]', label: 'Info' },
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
  const color = score >= 80 ? 'var(--color-success-light)' : score >= 60 ? '#eab308' : 'var(--color-danger-light)'

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
        <span className="text-3xl font-bold text-[var(--foreground)]">{score}</span>
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">/ 100</span>
      </div>
    </div>
  )
}

function DimensionBar({ dim }: { dim: HealthDimension }) {
  const pct = (dim.score / dim.maxScore) * 100
  const color = dim.status === 'good' ? 'var(--color-success-light)' : dim.status === 'warning' ? '#eab308' : 'var(--color-danger-light)'
  const Icon = DIMENSION_ICONS[dim.id] ?? Activity

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-[var(--color-text-muted)]" />
          <span className="text-xs font-medium text-[var(--foreground)]">{dim.label}</span>
        </div>
        <span className="text-xs font-mono text-[var(--color-text-muted)]">{dim.score}/{dim.maxScore}</span>
      </div>
      <div className="h-1.5 bg-[var(--color-surface-elevated)] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
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
    <div className={cn('flex items-start gap-3 p-3 rounded-xl border', style.bg, style.border)}>
      <style.icon size={18} className={cn(style.iconColor, 'shrink-0 mt-0.5')} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-[var(--foreground)]">{alert.title}</span>
          <CatIcon size={12} className="text-[var(--color-text-muted)]" />
        </div>
        <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">{alert.description}</p>
        {alert.action && (
          <p className="text-[10px] text-[var(--color-amber)] font-medium mt-1 flex items-center gap-1">
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

function RecommendationCard({ rec, t }: { rec: Recommendation; t: TranslationKeys }) {
  const priorityColor = rec.priority === 'high' ? 'var(--color-danger-light)' : rec.priority === 'medium' ? '#eab308' : 'var(--color-info-light)'
  const EffortIcon = rec.effort === 'quick' ? Zap : rec.effort === 'moderate' ? Wrench : Building2
  const effortLabel = rec.effort === 'quick' ? t.intelligence.effortQuick : rec.effort === 'moderate' ? t.intelligence.effortModerate : t.intelligence.effortSignificant

  return (
    <div
      className={cn(
        'border border-[var(--color-border)] rounded-xl p-3 border-s-4',
        rec.priority === 'high' ? 'border-s-[var(--color-danger-light)]' : rec.priority === 'medium' ? 'border-s-[#eab308]' : 'border-s-[var(--color-info-light)]'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold text-[var(--foreground)]">{rec.title}</span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: `${priorityColor}15`, color: priorityColor }}
            >
              {rec.priority}
            </span>
          </div>
          <p className="text-[11px] text-[var(--color-text-secondary)]">{rec.description}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[var(--color-text-muted)]">
            <span>{t.intelligence.impact}: {rec.impact}</span>
            <span className="flex items-center gap-1"><EffortIcon size={10} /> {effortLabel}</span>
          </div>
        </div>
        <ChevronRight size={16} className="text-[var(--color-text-muted)] shrink-0 mt-1" />
      </div>
    </div>
  )
}

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } }

export default function ProjectIntelligencePage() {
  const params = useParams()
  const projectId = params.id as string
  const { t } = useI18n()
  const { toast } = useToast()
  const [health, setHealth] = useState<HealthScore | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [h, p] = await Promise.all([
        getProjectHealth(projectId),
        getProject(projectId),
      ])
      setHealth(h)
      setProject(p)
    } catch (e) {
      const message = e instanceof Error ? e.message : t.intelligence.failedToLoadHealth
      setError(message)
      toast({ title: t.intelligence.failedToLoad, description: message, variant: 'danger' })
    } finally {
      setLoading(false)
    }
  }, [projectId, t, toast])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-amber)]/10 animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-[var(--color-surface)] rounded animate-pulse" />
              <div className="h-4 w-64 bg-[var(--color-surface)] rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <CardSkeleton />
            <CardSkeleton className="lg:col-span-2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-[var(--color-surface)] rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-danger-bg)]/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-[var(--color-danger-light)]" />
          </div>
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-2">{t.intelligence.failedToLoad}</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">{error}</p>
          <button onClick={load} className="px-5 py-2.5 bg-[var(--color-amber)] text-[var(--color-on-amber)] text-sm font-bold rounded-xl hover:opacity-90 transition-all">
            {t.dashboard.retry}
          </button>
        </motion.div>
      </div>
    )
  }

  if (!health || !project) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <PageHeader icon={Activity} title={t.intelligence.title} gradient="from-[var(--color-amber)] to-[var(--color-amber-dark)]" />
          <EmptyState
            icon={Activity}
            title={t.intelligence.noHealthData}
            description={t.intelligence.noHealthDataDesc}
          />
        </div>
      </div>
    )
  }

  const criticals = health.alerts.filter(a => a.severity === 'critical')
  const warnings = health.alerts.filter(a => a.severity === 'warning')
  const infos = health.alerts.filter(a => a.severity === 'info')
  const highRecs = health.recommendations.filter(r => r.priority === 'high')

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <motion.div
        className="mx-auto max-w-7xl p-4 md:p-6 space-y-6"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* ── Header — Obsidian & Amber ── */}
        <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 md:p-8">
          {/* Subtle amber top line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-amber)]/60 to-transparent" />
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-[var(--color-amber)]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-[var(--color-amber)]/10 border border-[var(--color-amber)]/20">
                  <Activity size={16} className="text-[var(--color-amber)]" />
                </div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-[var(--foreground)]">{t.intelligence.title}</h1>
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">{project.name} — {t.intelligence.subtitle}</p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              title={t.intelligence.refresh}
              aria-label={t.intelligence.refresh}
              aria-busy={loading}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--foreground)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl hover:border-[var(--color-amber)]/40 transition-all shrink-0"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {t.intelligence.refresh}
            </button>
          </div>
        </motion.div>

        {/* ── Top row: Score + Urgent ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Health Score */}
          <motion.div variants={fadeUp}>
            <SectionCard title={t.intelligence.healthScore} icon={Shield} iconColor="text-[var(--color-amber)]" glass className="h-full">
              <div className="flex flex-col items-center">
                <ScoreRing score={health.overall} />
                <p className="text-xs text-[var(--color-text-muted)] text-center mt-3 max-w-[240px]">{health.summary}</p>
                <div className="flex items-center gap-4 mt-4 text-[10px]">
                  <span className="flex items-center gap-1 text-[var(--color-danger-light)]"><XCircle size={12} /> {criticals.length} {t.intelligence.critical}</span>
                  <span className="flex items-center gap-1 text-[var(--color-amber)]"><AlertTriangle size={12} /> {warnings.length} {t.intelligence.warning}</span>
                  <span className="flex items-center gap-1 text-[var(--color-info-light)]"><Info size={12} /> {infos.length} {t.intelligence.info}</span>
                </div>
              </div>
            </SectionCard>
          </motion.div>

          {/* Today's Priorities */}
          <motion.div variants={fadeUp} className="lg:col-span-2">
            <SectionCard title={t.intelligence.requiresAttentionToday} icon={Target} iconColor="text-[var(--color-danger-light)]" className="h-full">
              {criticals.length === 0 && highRecs.length === 0 ? (
                <div className="flex items-center gap-3 p-4 bg-[var(--color-success-bg)] border border-[var(--color-success)]/20 rounded-xl">
                  <CheckCircle2 size={24} className="text-[var(--color-success-light)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-success-light)]">{t.intelligence.allClear}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{t.intelligence.noCriticalIssues}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {criticals.map(alert => <AlertCard key={alert.id} alert={alert} />)}
                  {highRecs.map(rec => <RecommendationCard key={rec.id} rec={rec} t={t} />)}
                </div>
              )}
            </SectionCard>
          </motion.div>
        </div>

        {/* ── Dimension Scores ── */}
        <motion.div variants={fadeUp}>
          <SectionCard
            title={t.intelligence.healthDimensions}
            icon={Sparkles}
            iconColor="text-[var(--color-amber)]"
            actions={<span className="text-[10px] text-[var(--color-text-muted)]">{t.intelligence.hoverForDetails}</span>}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {health.dimensions.map(dim => (
                <DimensionBar key={dim.id} dim={dim} />
              ))}
            </div>
          </SectionCard>
        </motion.div>

        {/* ── Alerts + Recommendations ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* All Alerts */}
          <motion.div variants={fadeUp}>
            <SectionCard
              title={t.intelligence.allAlerts}
              icon={AlertTriangle}
              iconColor="text-[var(--color-amber)]"
              className="h-full"
              actions={
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                  {health.alerts.length}
                </span>
              }
            >
              {health.alerts.length === 0 ? (
                <EmptyState icon={CheckCircle2} title={t.intelligence.noAlerts} description={t.intelligence.everythingLooksGood} compact />
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {health.alerts.map(alert => <AlertCard key={alert.id} alert={alert} />)}
                </div>
              )}
            </SectionCard>
          </motion.div>

          {/* Recommendations */}
          <motion.div variants={fadeUp}>
            <SectionCard
              title={t.intelligence.recommendations}
              icon={Sparkles}
              iconColor="text-[var(--color-amber)]"
              className="h-full"
              actions={
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                  {health.recommendations.length}
                </span>
              }
            >
              {health.recommendations.length === 0 ? (
                <EmptyState icon={Sparkles} title={t.intelligence.noRecommendations} description={t.intelligence.projectWellManaged} compact />
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {health.recommendations.map(rec => <RecommendationCard key={rec.id} rec={rec} t={t} />)}
                </div>
              )}
            </SectionCard>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
