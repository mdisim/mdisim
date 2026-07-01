'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  FolderKanban, Ruler, DollarSign, TrendingUp, TrendingDown,
  FileSpreadsheet, MapPin, Clock, ArrowUpRight, Users, Receipt,
  AlertTriangle, CheckCircle2, BarChart3, Activity, Percent,
  Plus, Eye, FileText, Layers, Building2, Briefcase, ArrowRight,
  Sparkles, Target, Wallet, FolderOpen, Zap, Shield, CircleDollarSign,
  CalendarDays, Gauge, PieChart, LineChart,
} from 'lucide-react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import type { TranslationKeys } from '@/lib/i18n/translations'
import { getDashboardSummaries } from '@/app/actions/dashboard'
import type { ProjectSummary } from '@/app/actions/dashboard'
import type { Project } from '@/lib/types'
import { StatCard } from '@/components/ui/stat-card'
import { SectionCard } from '@/components/ui/section-card'
import { PageHeader } from '@/components/ui/page-header'
import { DonutChart, SimpleBarChart, ProgressRing } from '@/components/ui/mini-chart'
import { EmptyState } from '@/components/ui/empty-state'
import { CardSkeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'

function CashFlowChart({ data }: { data: { month: string; income: number; expense: number }[] }) {
  const max = Math.max(...data.flatMap(d => [d.income, d.expense]), 1)

  return (
    <div className="relative h-48">
      <div className="absolute inset-0 flex items-end justify-between gap-1.5 px-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex items-end gap-0.5 h-full">
            <motion.div
              className="flex-1 rounded-t-sm bg-[var(--color-amber)] opacity-80"
              initial={{ height: 0 }}
              animate={{ height: `${(d.income / max) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.div
              className="flex-1 rounded-t-sm bg-[var(--color-info)] opacity-60"
              initial={{ height: 0 }}
              animate={{ height: `${(d.expense / max) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.05 + 0.1, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[8px] text-[var(--color-text-muted)] mt-1">{d.month}</span>
        ))}
      </div>
    </div>
  )
}

function ProjectCard({ project, summary, onClick, t }: { project: Project; summary: ProjectSummary; onClick: () => void; t: TranslationKeys }) {
  const contractVal = summary.contract?.contract_value ?? 0
  const actual = summary.costEntries.filter(c => c.category === 'actual').reduce((a, b) => a + b.amount, 0)
  const progress = project.progress ?? 0
  const fmtCompact = (n: number) => {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`
    return n.toFixed(0)
  }

  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="group relative rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 cursor-pointer transition-all duration-300 hover:border-[var(--color-amber)]/40 hover:bg-[var(--color-surface-elevated)]"
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--color-amber)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl" />

      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-[var(--foreground)] truncate">{project.name}</h4>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{project.location ?? t.dashboard.noLocation}</p>
        </div>
        <div className={cn(
          'px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider',
          project.status === 'active'
            ? 'bg-[var(--color-amber)]/10 text-[var(--color-amber)] border border-[var(--color-amber)]/20'
            : project.status === 'completed'
            ? 'bg-[var(--color-info)]/10 text-[var(--color-info)] border border-[var(--color-info)]/20'
            : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
        )}>
          {project.status}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <ProgressRing
          value={progress}
          size={44}
          strokeWidth={5}
          color={progress >= 80 ? '#22c55e' : progress >= 40 ? '#eab308' : '#f87171'}
        />
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-[var(--color-text-muted)]">{t.dashboard.contract}</span>
            <span className="font-semibold text-[var(--foreground)] tabular-nums">${fmtCompact(contractVal)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-[var(--color-text-muted)]">{t.dashboard.spent}</span>
            <span className="font-semibold text-[#f87171] tabular-nums">${fmtCompact(actual)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
          <span className="flex items-center gap-0.5"><FileSpreadsheet size={10} />{summary.boqItems.length}</span>
          <span className="flex items-center gap-0.5"><Ruler size={10} />{summary.measurementItems.length}</span>
          <span className="flex items-center gap-0.5"><Receipt size={10} />{summary.paymentCerts.length}</span>
        </div>
        <ArrowUpRight size={14} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-amber)] transition-colors" />
      </div>
    </motion.div>
  )
}

function InsightCard({ icon: Icon, title, value, subtitle, color }: { icon: LucideIcon; title: string; value: string; subtitle: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)]"
    >
      <div className="p-2 rounded-lg shrink-0" style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
        <Icon size={14} style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{title}</div>
        <div className="text-sm font-bold text-[var(--foreground)]">{value}</div>
        <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{subtitle}</div>
      </div>
    </motion.div>
  )
}

import type { LucideIcon } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [summaries, setSummaries] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { projects: allProjects, summaries: results } = await getDashboardSummaries()
        setProjects(allProjects)
        setSummaries(results)
      } catch {
        setError(t.dashboard.failedToLoadDashboard)
        toast({ title: t.dashboard.failedToLoadDashboard, variant: 'danger' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const {
    totalProjects, totalBOQValue, totalContractValue, totalActualCost,
    totalCommitted, totalForecast, totalPaid, pendingPayments,
    pendingVariations, approvedVariations, activeTenders,
    totalMeasurements, totalMeasurementLines,
    totalForecastCost, projectedProfit, profitMargin,
  } = useMemo(() => {
    const totalProjects = projects.length
    const totalBOQValue = summaries.reduce((s, p) => s + p.boqItems.reduce((a, b) => a + (b.total_amount ?? 0), 0), 0)
    const totalContractValue = summaries.reduce((s, p) => s + (p.contract?.contract_value ?? 0), 0)
    const totalActualCost = summaries.reduce((s, p) => s + p.costEntries.filter(c => c.category === 'actual').reduce((a, b) => a + b.amount, 0), 0)
    const totalCommitted = summaries.reduce((s, p) => s + p.costEntries.filter(c => c.category === 'committed').reduce((a, b) => a + b.amount, 0), 0)
    const totalForecast = summaries.reduce((s, p) => s + p.costEntries.filter(c => c.category === 'forecast').reduce((a, b) => a + b.amount, 0), 0)
    const totalPaid = summaries.reduce((s, p) => s + p.paymentCerts.filter(c => c.status === 'paid').reduce((a, b) => a + b.net_payable, 0), 0)
    const pendingPayments = summaries.reduce((s, p) => s + p.paymentCerts.filter(c => c.status !== 'paid' && c.status !== 'draft').reduce((a, b) => a + b.net_payable, 0), 0)
    const pendingVariations = summaries.reduce((s, p) => s + p.variations.filter(v => v.status === 'pending' || v.status === 'submitted').reduce((a, b) => a + b.amount, 0), 0)
    const approvedVariations = summaries.reduce((s, p) => s + p.variations.filter(v => v.status === 'approved').reduce((a, b) => a + (b.approved_amount ?? b.amount), 0), 0)
    const activeTenders = summaries.reduce((s, p) => s + p.tenders.filter(t => t.status === 'issued').length, 0)
    const totalMeasurements = summaries.reduce((s, p) => s + p.measurementItems.length, 0)
    const totalMeasurementLines = summaries.reduce((s, p) => s + p.measurementItems.reduce((a, m) => a + (m.lines?.length ?? 0), 0), 0)
    const totalForecastCost = totalActualCost + totalCommitted + totalForecast
    const projectedProfit = totalContractValue + approvedVariations - totalForecastCost
    const profitMargin = totalContractValue > 0 ? ((projectedProfit / totalContractValue) * 100) : 0
    return {
      totalProjects, totalBOQValue, totalContractValue, totalActualCost,
      totalCommitted, totalForecast, totalPaid, pendingPayments,
      pendingVariations, approvedVariations, activeTenders,
      totalMeasurements, totalMeasurementLines,
      totalForecastCost, projectedProfit, profitMargin,
    }
  }, [projects, summaries])

  const fmtCompact = (n: number) => {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
    return `$${n.toFixed(0)}`
  }

  const earnedValueData = useMemo(() => summaries
    .filter(s => s.contract)
    .map(s => {
      const BAC = s.contract!.contract_value
      const latestCert = s.paymentCerts.length > 0
        ? s.paymentCerts.reduce((best, c) => c.cert_number > best.cert_number ? c : best, s.paymentCerts[0])
        : null
      const percentComplete = latestCert
        ? (latestCert.gross_amount > 0 ? (latestCert.gross_amount / BAC) * 100 : 0)
        : (s.project.progress ?? 0)
      const EV = (percentComplete / 100) * BAC

      const contract = s.contract!
      let PV = BAC
      if (contract.start_date && contract.end_date) {
        const start = new Date(contract.start_date).getTime()
        const end = new Date(contract.end_date).getTime()
        const now = Date.now()
        const totalDuration = end - start
        if (totalDuration > 0) {
          const elapsed = Math.min(now - start, totalDuration)
          PV = (elapsed / totalDuration) * BAC
        }
      } else if (contract.start_date && contract.duration_months) {
        const start = new Date(contract.start_date).getTime()
        const end = new Date(contract.start_date)
        end.setMonth(end.getMonth() + contract.duration_months)
        const totalDuration = end.getTime() - start
        if (totalDuration > 0) {
          const elapsed = Math.min(Date.now() - start, totalDuration)
          PV = (elapsed / totalDuration) * BAC
        }
      }

      const AC = s.costEntries.filter(c => c.category === 'actual').reduce((a, b) => a + b.amount, 0)
      const SPI = PV > 0 ? EV / PV : 0
      const CPI = AC > 0 ? EV / AC : 0
      const EAC = CPI > 0 ? BAC / CPI : BAC
      const VAC = BAC - EAC

      return { name: s.project.name, BAC, EV, PV, AC, SPI, CPI, EAC, VAC, percentComplete }
    }), [summaries])

  const cashFlowData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const allCashflow = summaries.flatMap(s => s.cashflow)
    if (allCashflow.length === 0) {
      const paymentsByMonth: Record<number, number> = {}
      const costsByMonth: Record<number, number> = {}
      for (const s of summaries) {
        for (const cert of s.paymentCerts) {
          if (cert.created_at) {
            const m = new Date(cert.created_at).getMonth()
            paymentsByMonth[m] = (paymentsByMonth[m] ?? 0) + cert.net_payable
          }
        }
        for (const cost of s.costEntries) {
          if (cost.period_date) {
            const m = new Date(cost.period_date).getMonth()
            costsByMonth[m] = (costsByMonth[m] ?? 0) + cost.amount
          }
        }
      }
      return months.map((month, i) => ({
        month,
        income: paymentsByMonth[i] ?? 0,
        expense: costsByMonth[i] ?? 0,
      }))
    }
    const byMonth: Record<string, { income: number; expense: number }> = {}
    for (const c of allCashflow) {
      const key = c.period_date ? months[new Date(c.period_date).getMonth()] : 'N/A'
      if (!byMonth[key]) byMonth[key] = { income: 0, expense: 0 }
      byMonth[key].income += c.actual_income
      byMonth[key].expense += c.actual_expense
    }
    return Object.entries(byMonth).map(([month, v]) => ({ month, ...v }))
  }, [summaries])

  const completionRate = useMemo(() => {
    if (projects.length === 0) return 0
    return projects.reduce((sum, p) => sum + (p.progress ?? 0), 0) / projects.length
  }, [projects])

  const budgetSegments = useMemo(() => [
    { value: totalActualCost, color: '#f87171', label: 'Actual Cost' },
    { value: totalCommitted, color: '#eab308', label: 'Committed' },
    { value: Math.max(0, totalContractValue - totalActualCost - totalCommitted), color: '#22c55e', label: 'Remaining' },
  ].filter(s => s.value > 0), [totalActualCost, totalCommitted, totalContractValue])

  const recentActivity = useMemo(() => {
    const items: { label: string; detail: string; time: string; color: string; icon: LucideIcon }[] = []
    for (const s of summaries) {
      for (const cert of s.paymentCerts.slice(-2)) {
        items.push({
          label: `Payment ${cert.status === 'paid' ? 'completed' : 'submitted'}`,
          detail: `${s.project.name} - IPC #${cert.cert_number}`,
          time: cert.created_at ?? s.project.updated_at,
          color: cert.status === 'paid' ? '#22c55e' : '#eab308',
          icon: cert.status === 'paid' ? CheckCircle2 : Clock,
        })
      }
      for (const v of s.variations.slice(-2)) {
        items.push({
          label: `Variation ${v.status}`,
          detail: `${s.project.name} - ${v.title ?? v.variation_no}`,
          time: v.created_at ?? s.project.updated_at,
          color: v.status === 'approved' ? 'var(--color-info)' : '#f87171',
          icon: v.status === 'approved' ? CheckCircle2 : AlertTriangle,
        })
      }
    }
    return items
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8)
  }, [summaries])

  const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
  const fadeUp: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="mx-auto max-w-[1400px] p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-amber)]/10 animate-pulse" />
            <div className="space-y-2">
              <div className="h-7 w-48 bg-[var(--color-surface)] rounded-lg animate-pulse" />
              <div className="h-4 w-64 bg-[var(--color-surface)] rounded animate-pulse" />
            </div>
          </div>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            {[1,2,3,4,5].map(i => <CardSkeleton key={i} />)}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {[1,2,3].map(i => <div key={i} className="h-64 rounded-2xl bg-[var(--color-surface)] animate-pulse" />)}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-danger-bg)] flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-2">{t.dashboard.dashboardUnavailable}</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-[var(--color-amber)] text-[var(--color-on-amber)] text-sm font-bold rounded-xl hover:opacity-90 transition-all">
            {t.dashboard.retry}
          </button>
        </motion.div>
      </div>
    )
  }

  if (summaries.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-6 md:p-8">
        <div className="mx-auto max-w-[1400px] space-y-6">
          <PageHeader icon={Activity} title={t.dashboard.title} subtitle={t.dashboard.subtitle} gradient="from-[var(--color-amber)] to-[var(--color-amber-dark)]" />
          <EmptyState
            icon={FolderOpen}
            title={t.dashboard.noProjectsYet}
            description={t.dashboard.noProjectsYetDesc}
            actionLabel={t.dashboard.goToProjects}
            onAction={() => router.push('/projects')}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <motion.div
        className="mx-auto max-w-[1400px] space-y-6 p-6 md:p-8"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* ── Hero Header — Obsidian & Amber ── */}
        <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 md:p-8">
          {/* Subtle amber glow top-right */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-[var(--color-amber)]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-amber)]/40 to-transparent" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-amber)]/10 border border-[var(--color-amber)]/20 text-[10px] font-bold tracking-widest uppercase text-[var(--color-amber)]">
                  <span className="w-1 h-1 rounded-full bg-[var(--color-amber)] animate-ping" />
                  {t.dashboard.brandTag}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--foreground)]">{t.dashboard.title}</h1>
              <p className="text-[var(--color-text-muted)] mt-1 text-sm">{t.dashboard.subtitle}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/projects')}
                className="flex items-center gap-2 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--color-amber)]/40 transition-all"
              >
                <Eye size={15} />
                {t.dashboard.viewAll}
              </button>
              <button
                onClick={() => router.push('/projects')}
                className="flex items-center gap-2 rounded-xl bg-[var(--color-amber)] px-4 py-2.5 text-sm font-bold text-[var(--color-on-amber)] hover:opacity-90 transition-all shadow-lg shadow-[var(--color-amber)]/20"
              >
                <Plus size={15} />
                {t.dashboard.newProject}
              </button>
            </div>
          </div>

          {/* Hero Stats Strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-[var(--color-border)]"
          >
            {[
              { label: t.dashboard.portfolioValue, value: fmtCompact(totalContractValue), icon: Building2 },
              { label: t.dashboard.totalSpent, value: fmtCompact(totalActualCost), icon: Wallet },
              { label: t.dashboard.paymentsCollected, value: fmtCompact(totalPaid), icon: CircleDollarSign },
              { label: t.dashboard.projectedProfit, value: fmtCompact(projectedProfit), icon: TrendingUp },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--color-amber)]/10 border border-[var(--color-amber)]/20">
                  <stat.icon size={16} className="text-[var(--color-amber)]" />
                </div>
                <div>
                  <div className="text-lg font-bold tabular-nums text-[var(--foreground)]">{stat.value}</div>
                  <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{stat.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {([
            { label: t.dashboard.totalProjects, value: totalProjects, icon: FolderKanban, gradient: 'from-[#ffd165] to-[#eab308]', trend: undefined, glass: true },
            { label: t.dashboard.totalBudget, value: totalContractValue, icon: Briefcase, gradient: 'from-[#ffd165]/60 to-[#eab308]/60', prefix: '$', decimals: 2, glass: true },
            { label: t.dashboard.activeTenders, value: activeTenders, icon: Receipt, gradient: 'from-[#9b8f79] to-[#4f4633]', glass: true },
            { label: t.dashboard.totalPayments, value: totalPaid, icon: DollarSign, gradient: 'from-[#22c55e] to-[#16a34a]', prefix: '$', decimals: 2, glass: true },
            { label: t.dashboard.completion, value: completionRate, icon: Target, gradient: 'from-[#ffd165] to-[#eab308]', suffix: '%', decimals: 1, glass: true },
          ] as const).map((kpi, index) => (
            <motion.div key={kpi.label} variants={fadeUp}>
              <StatCard
                label={kpi.label}
                value={kpi.value}
                icon={kpi.icon}
                gradient={kpi.gradient}
                prefix={'prefix' in kpi ? kpi.prefix : undefined}
                suffix={'suffix' in kpi ? kpi.suffix : undefined}
                decimals={'decimals' in kpi ? kpi.decimals : 0}
                glass
              />
            </motion.div>
          ))}
        </div>

        {/* ── Main Grid: 3 Columns ── */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Budget + Cash Flow */}
          <div className="lg:col-span-4 space-y-6">
            <motion.div variants={fadeUp}>
              <SectionCard title={t.dashboard.budgetOverview} icon={PieChart} iconColor="text-[var(--color-amber)]">
                {budgetSegments.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <DonutChart segments={budgetSegments} size={180} showLegend={false} />
                    <div className="mt-5 grid grid-cols-3 gap-3 w-full">
                      {budgetSegments.map((seg, i) => (
                        <div key={i} className="text-center p-2 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
                          <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: seg.color }} />
                          <div className="text-[9px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{seg.label}</div>
                          <div className="text-xs font-bold text-[var(--foreground)] tabular-nums mt-0.5">{fmtCompact(seg.value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)] text-center py-8">{t.dashboard.noBudgetData}</p>
                )}
              </SectionCard>
            </motion.div>

            <motion.div variants={fadeUp}>
              <SectionCard title={t.dashboard.cashFlow} icon={LineChart} iconColor="text-[var(--color-amber)]">
                {cashFlowData.some(d => d.income > 0 || d.expense > 0) ? (
                  <>
                    <CashFlowChart data={cashFlowData} />
                    <div className="flex items-center justify-center gap-5 mt-3 text-[10px] text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--color-amber)]" />{t.dashboard.income}</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--color-info)]" />{t.dashboard.expense}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)] text-center py-8">{t.dashboard.noCashFlowData}</p>
                )}
              </SectionCard>
            </motion.div>
          </div>

          {/* Center Column: Projects + Activity */}
          <div className="lg:col-span-5 space-y-6">
            <motion.div variants={fadeUp}>
              <SectionCard
                title={t.dashboard.projects}
                icon={FolderKanban}
                iconColor="text-[var(--color-amber)]"
                noPadding
                actions={
                  <button
                    onClick={() => router.push('/projects')}
                    className="text-[10px] font-semibold text-[var(--color-amber)] hover:opacity-80 flex items-center gap-1 transition-opacity"
                  >
                    {t.dashboard.viewAll} <ArrowRight size={10} />
                  </button>
                }
              >
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  {summaries.slice(0, 4).map(s => (
                    <ProjectCard
                      key={s.project.id}
                      project={s.project}
                      summary={s}
                      onClick={() => router.push(`/projects/${s.project.id}`)}
                      t={t}
                    />
                  ))}
                </div>
              </SectionCard>
            </motion.div>

            <motion.div variants={fadeUp}>
              <SectionCard title={t.dashboard.recentActivity} icon={Clock} iconColor="text-[var(--color-amber)]" noPadding>
                {recentActivity.length > 0 ? (
                  <div className="divide-y divide-[var(--color-border)]">
                    {recentActivity.map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--color-surface-elevated)] transition-colors"
                      >
                        <div
                          className="p-1.5 rounded-lg shrink-0"
                          style={{ background: `${item.color}18`, border: `1px solid ${item.color}30` }}
                        >
                          <item.icon size={12} style={{ color: item.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-semibold text-[var(--foreground)]">{item.label}</div>
                          <div className="text-[10px] text-[var(--color-text-muted)] truncate">{item.detail}</div>
                        </div>
                        <div className="text-[9px] text-[var(--color-text-muted)] shrink-0 tabular-nums">
                          {formatDate(item.time)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)] text-center py-8 px-6">{t.dashboard.noRecentActivity}</p>
                )}
              </SectionCard>
            </motion.div>
          </div>

          {/* Right Column: Health + EVM + Insights */}
          <div className="lg:col-span-3 space-y-6">
            <motion.div variants={fadeUp}>
              <SectionCard title={t.dashboard.projectHealth} icon={Activity} iconColor="text-[var(--color-amber)]">
                <div className="space-y-4">
                  {summaries.slice(0, 4).map(s => {
                    const progress = s.project.progress ?? 0
                    return (
                      <div key={s.project.id} className="flex items-center gap-3">
                        <ProgressRing
                          value={progress}
                          size={48}
                          strokeWidth={5}
                          color={progress >= 80 ? '#22c55e' : progress >= 40 ? '#eab308' : '#f87171'}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-semibold text-[var(--foreground)] truncate">{s.project.name}</div>
                          <div className="text-[10px] text-[var(--color-text-muted)]">{progress.toFixed(0)}{t.dashboard.percentComplete}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </SectionCard>
            </motion.div>

            <motion.div variants={fadeUp}>
              <SectionCard title={t.dashboard.evmPerformance} icon={Gauge} iconColor="text-[var(--color-amber)]">
                {earnedValueData.length > 0 ? (
                  <div className="space-y-3">
                    {earnedValueData.slice(0, 3).map((ev, i) => (
                      <div key={i} className="p-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
                        <div className="text-[11px] font-semibold text-[var(--foreground)] truncate mb-2">{ev.name}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider">SPI</div>
                            <div className={cn('text-sm font-bold tabular-nums', ev.SPI >= 1 ? 'text-[#22c55e]' : ev.SPI >= 0.9 ? 'text-[var(--color-amber)]' : 'text-[#f87171]')}>
                              {ev.SPI.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider">CPI</div>
                            <div className={cn('text-sm font-bold tabular-nums', ev.CPI >= 1 ? 'text-[#22c55e]' : ev.CPI >= 0.9 ? 'text-[var(--color-amber)]' : 'text-[#f87171]')}>
                              {ev.CPI.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)] text-center py-6">{t.dashboard.noEvmData}</p>
                )}
              </SectionCard>
            </motion.div>

            {/* AI Insights */}
            <motion.div variants={fadeUp}>
              <SectionCard title={t.dashboard.insights} icon={Sparkles} iconColor="text-[var(--color-amber)]">
                <div className="space-y-3">
                  {profitMargin !== 0 && (
                    <InsightCard
                      icon={profitMargin > 0 ? TrendingUp : TrendingDown}
                      title={t.dashboard.profitMargin}
                      value={`${profitMargin.toFixed(1)}%`}
                      subtitle={profitMargin > 10 ? t.dashboard.portfolioPerformingWell : profitMargin > 0 ? t.dashboard.marginsAreThin : t.dashboard.portfolioAtRisk}
                      color={profitMargin > 10 ? '#22c55e' : profitMargin > 0 ? '#eab308' : '#f87171'}
                    />
                  )}
                  {pendingPayments > 0 && (
                    <InsightCard
                      icon={Clock}
                      title={t.dashboard.pendingPayments}
                      value={fmtCompact(pendingPayments)}
                      subtitle={t.dashboard.awaitingClientApproval}
                      color="var(--color-info)"
                    />
                  )}
                  {pendingVariations > 0 && (
                    <InsightCard
                      icon={AlertTriangle}
                      title={t.dashboard.pendingVariations}
                      value={fmtCompact(pendingVariations)}
                      subtitle={t.dashboard.requiresFollowUp}
                      color="#f87171"
                    />
                  )}
                  {totalMeasurements > 0 && (
                    <InsightCard
                      icon={Ruler}
                      title={t.dashboard.measurements}
                      value={`${totalMeasurements} ${t.dashboard.items}`}
                      subtitle={`${totalMeasurementLines} ${t.dashboard.calculationLines}`}
                      color="#a855f7"
                    />
                  )}
                </div>
              </SectionCard>
            </motion.div>
          </div>
        </div>

        {/* ── Bottom: Financial Summary ── */}
        <motion.div variants={fadeUp}>
          <SectionCard title={t.dashboard.financialSummary} icon={DollarSign} iconColor="text-[var(--color-amber)]">
            {summaries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-start">
                  <thead>
                    <tr className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest border-b border-[var(--color-border)]">
                      <th className="pb-3 pe-4">{t.dashboard.tableProject}</th>
                      <th className="pb-3 pe-4 text-end">{t.dashboard.tableContract}</th>
                      <th className="pb-3 pe-4 text-end">{t.dashboard.tableVariations}</th>
                      <th className="pb-3 pe-4 text-end">{t.dashboard.tableActualCost}</th>
                      <th className="pb-3 pe-4 text-end">{t.dashboard.tableProfit}</th>
                      <th className="pb-3 text-end">{t.dashboard.tableMargin}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {summaries.map((s, idx) => {
                      const contractVal = s.contract?.contract_value ?? 0
                      const varApproved = s.variations.filter(v => v.status === 'approved').reduce((a, b) => a + (b.approved_amount ?? b.amount), 0)
                      const actual = s.costEntries.filter(c => c.category === 'actual').reduce((a, b) => a + b.amount, 0)
                      const committed = s.costEntries.filter(c => c.category === 'committed').reduce((a, b) => a + b.amount, 0)
                      const forecast = s.costEntries.filter(c => c.category === 'forecast').reduce((a, b) => a + b.amount, 0)
                      const totalCost = actual + committed + forecast
                      const revised = contractVal + varApproved
                      const profit = revised - totalCost
                      const margin = revised > 0 ? (profit / revised) * 100 : 0

                      return (
                        <tr
                          key={s.project.id}
                          className={cn(
                            'group cursor-pointer hover:bg-[var(--color-amber)]/5 transition-colors',
                            idx % 2 === 0 ? 'bg-transparent' : 'bg-[var(--color-surface-elevated)]'
                          )}
                          onClick={() => router.push(`/projects/${s.project.id}`)}
                        >
                          <td className="py-3 pe-4">
                            <div className="text-[12px] font-semibold text-[var(--foreground)] group-hover:text-[var(--color-amber)] transition-colors">{s.project.name}</div>
                          </td>
                          <td className="py-3 pe-4 text-end text-[12px] font-medium text-[var(--color-text-secondary)] tabular-nums">{fmtCompact(contractVal)}</td>
                          <td className="py-3 pe-4 text-end text-[12px] font-medium text-[var(--color-info)] tabular-nums">{varApproved > 0 ? `+${fmtCompact(varApproved)}` : '-'}</td>
                          <td className="py-3 pe-4 text-end text-[12px] font-medium text-[#f87171] tabular-nums">{fmtCompact(actual)}</td>
                          <td className={cn('py-3 pe-4 text-end text-[12px] font-bold tabular-nums', profit >= 0 ? 'text-[#22c55e]' : 'text-[#f87171]')}>{fmtCompact(profit)}</td>
                          <td className="py-3 text-end">
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold',
                              margin >= 10 ? 'bg-[#22c55e]/10 text-[#22c55e]' :
                              margin >= 0 ? 'bg-[var(--color-amber)]/10 text-[var(--color-amber)]' :
                              'bg-[#f87171]/10 text-[#f87171]'
                            )}>
                              {margin.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-8">{t.dashboard.noFinancialData}</p>
            )}
          </SectionCard>
        </motion.div>
      </motion.div>
    </div>
  )
}
