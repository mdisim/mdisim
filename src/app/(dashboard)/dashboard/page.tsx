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
import { getDashboardSummaries } from '@/app/actions/dashboard'
import type { ProjectSummary } from '@/app/actions/dashboard'
import type { Project } from '@/lib/types'
import { StatCard } from '@/components/ui/stat-card'
import { SectionCard } from '@/components/ui/section-card'
import { PageHeader } from '@/components/ui/page-header'
import { DonutChart, SimpleBarChart, ProgressRing } from '@/components/ui/mini-chart'
import { EmptyState } from '@/components/ui/empty-state'
import { CardSkeleton } from '@/components/ui/skeleton'

function CashFlowChart({ data }: { data: { month: string; income: number; expense: number }[] }) {
  const max = Math.max(...data.flatMap(d => [d.income, d.expense]), 1)

  return (
    <div className="relative h-48">
      <div className="absolute inset-0 flex items-end justify-between gap-1.5 px-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex items-end gap-0.5 h-full">
            <motion.div
              className="flex-1 rounded-t-md bg-gradient-to-t from-emerald-500 to-emerald-400 opacity-80"
              initial={{ height: 0 }}
              animate={{ height: `${(d.income / max) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.div
              className="flex-1 rounded-t-md bg-gradient-to-t from-rose-500 to-rose-400 opacity-80"
              initial={{ height: 0 }}
              animate={{ height: `${(d.expense / max) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.05 + 0.1, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[8px] text-slate-400 mt-1">{d.month}</span>
        ))}
      </div>
    </div>
  )
}

function ProjectCard({ project, summary, onClick }: { project: Project; summary: ProjectSummary; onClick: () => void }) {
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
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="group relative rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/40 p-4 cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-500/30"
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-2xl" />

      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{project.name}</h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{project.location ?? 'No location'}</p>
        </div>
        <div className={cn(
          'px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider',
          project.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
          project.status === 'completed' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' :
          'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
        )}>
          {project.status}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <ProgressRing value={progress} size={44} strokeWidth={5} color={progress >= 80 ? '#10b981' : progress >= 40 ? '#3b82f6' : '#f59e0b'} />
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Contract</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">${fmtCompact(contractVal)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Spent</span>
            <span className="font-semibold text-rose-500 tabular-nums">${fmtCompact(actual)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/40">
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-0.5"><FileSpreadsheet size={10} />{summary.boqItems.length}</span>
          <span className="flex items-center gap-0.5"><Ruler size={10} />{summary.measurementItems.length}</span>
          <span className="flex items-center gap-0.5"><Receipt size={10} />{summary.paymentCerts.length}</span>
        </div>
        <ArrowUpRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors" />
      </div>
    </motion.div>
  )
}

function InsightCard({ icon: Icon, title, value, subtitle, gradient }: { icon: LucideIcon; title: string; value: string; subtitle: string; gradient: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]"
    >
      <div className={cn('p-2 rounded-lg bg-gradient-to-br text-white shrink-0', gradient)}>
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{title}</div>
        <div className="text-sm font-bold text-slate-900 dark:text-white">{value}</div>
        <div className="text-[10px] text-slate-400 mt-0.5">{subtitle}</div>
      </div>
    </motion.div>
  )
}

import type { LucideIcon } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { t } = useI18n()
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
        setError('Failed to load dashboard data. Please refresh the page.')
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
    { value: totalActualCost, color: '#f43f5e', label: 'Actual Cost' },
    { value: totalCommitted, color: '#f59e0b', label: 'Committed' },
    { value: Math.max(0, totalContractValue - totalActualCost - totalCommitted), color: '#10b981', label: 'Remaining' },
  ].filter(s => s.value > 0), [totalActualCost, totalCommitted, totalContractValue])

  const recentActivity = useMemo(() => {
    const items: { label: string; detail: string; time: string; color: string; icon: LucideIcon }[] = []
    for (const s of summaries) {
      for (const cert of s.paymentCerts.slice(-2)) {
        items.push({
          label: `Payment ${cert.status === 'paid' ? 'completed' : 'submitted'}`,
          detail: `${s.project.name} - IPC #${cert.cert_number}`,
          time: cert.created_at ?? s.project.updated_at,
          color: cert.status === 'paid' ? 'from-emerald-500 to-teal-500' : 'from-amber-500 to-orange-500',
          icon: cert.status === 'paid' ? CheckCircle2 : Clock,
        })
      }
      for (const v of s.variations.slice(-2)) {
        items.push({
          label: `Variation ${v.status}`,
          detail: `${s.project.name} - ${v.title ?? v.variation_no}`,
          time: v.created_at ?? s.project.updated_at,
          color: v.status === 'approved' ? 'from-blue-500 to-indigo-500' : 'from-orange-500 to-red-500',
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-[#0a0b0f] dark:via-[#0f1117] dark:to-[#0a0b0f]">
        <div className="mx-auto max-w-[1400px] p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 animate-pulse" />
            <div className="space-y-2">
              <div className="h-7 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
              <div className="h-4 w-64 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            {[1,2,3,4,5].map(i => <CardSkeleton key={i} />)}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {[1,2,3].map(i => <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />)}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-[#0a0b0f] dark:via-[#0f1117] dark:to-[#0a0b0f] flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Dashboard Unavailable</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all">
            Retry
          </button>
        </motion.div>
      </div>
    )
  }

  if (summaries.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-[#0a0b0f] dark:via-[#0f1117] dark:to-[#0a0b0f] p-6 md:p-8">
        <div className="mx-auto max-w-[1400px] space-y-6">
          <PageHeader icon={Activity} title={t.dashboard.title} subtitle={t.dashboard.subtitle} gradient="from-indigo-500 to-indigo-600" />
          <EmptyState
            icon={FolderOpen}
            title="No projects yet"
            description="Create your first project to start tracking budgets, measurements, and payments."
            actionLabel="Go to Projects"
            onAction={() => router.push('/projects')}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-[#0a0b0f] dark:via-[#0f1117] dark:to-[#0a0b0f]">
      <motion.div
        className="mx-auto max-w-[1400px] space-y-6 p-6 md:p-8"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* ── Hero Header ── */}
        <motion.div variants={fadeUp} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 p-8 text-white">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/[0.04] rounded-full blur-3xl" />
            <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-400/[0.03] rounded-full" />
          </div>

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="flex items-center gap-2 mb-3"
              >
                <div className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-[10px] font-semibold tracking-wider uppercase flex items-center gap-1.5">
                  <Sparkles size={10} className="text-amber-300" />
                  Angel D.C.
                </div>
              </motion.div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">{t.dashboard.title}</h1>
              <p className="text-white/60 mt-1 text-sm">{t.dashboard.subtitle}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/projects')}
                className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition-all"
              >
                <Eye size={15} />
                View All
              </button>
              <button
                onClick={() => router.push('/projects')}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-lg shadow-black/10 hover:shadow-xl transition-all"
              >
                <Plus size={15} />
                New Project
              </button>
            </div>
          </div>

          {/* Hero Stats Strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10"
          >
            {[
              { label: 'Portfolio Value', value: fmtCompact(totalContractValue), icon: Building2 },
              { label: 'Total Spent', value: fmtCompact(totalActualCost), icon: Wallet },
              { label: 'Payments Collected', value: fmtCompact(totalPaid), icon: CircleDollarSign },
              { label: 'Projected Profit', value: fmtCompact(projectedProfit), icon: TrendingUp },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10">
                  <stat.icon size={16} />
                </div>
                <div>
                  <div className="text-lg font-bold tabular-nums">{stat.value}</div>
                  <div className="text-[10px] text-white/50 uppercase tracking-wider">{stat.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {([
            { label: t.dashboard.totalProjects, value: totalProjects, icon: FolderKanban, gradient: 'from-violet-600 to-indigo-600', trend: undefined, glass: true },
            { label: t.dashboard.totalBudget, value: totalContractValue, icon: Briefcase, gradient: 'from-blue-600 to-cyan-600', prefix: '$', decimals: 2, glass: true },
            { label: t.dashboard.activeTenders, value: activeTenders, icon: Receipt, gradient: 'from-purple-600 to-fuchsia-600', glass: true },
            { label: t.dashboard.totalPayments, value: totalPaid, icon: DollarSign, gradient: 'from-emerald-600 to-teal-600', prefix: '$', decimals: 2, glass: true },
            { label: 'Completion', value: completionRate, icon: Target, gradient: 'from-amber-600 to-orange-600', suffix: '%', decimals: 1, glass: true },
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
              <SectionCard title={t.dashboard.budgetOverview} icon={PieChart} iconColor="text-rose-500">
                {budgetSegments.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <DonutChart segments={budgetSegments} size={180} showLegend={false} />
                    <div className="mt-5 grid grid-cols-3 gap-3 w-full">
                      {budgetSegments.map((seg, i) => (
                        <div key={i} className="text-center p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
                          <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: seg.color }} />
                          <div className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">{seg.label}</div>
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums mt-0.5">{fmtCompact(seg.value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">No budget data</p>
                )}
              </SectionCard>
            </motion.div>

            <motion.div variants={fadeUp}>
              <SectionCard title="Cash Flow" icon={LineChart} iconColor="text-emerald-500">
                {cashFlowData.some(d => d.income > 0 || d.expense > 0) ? (
                  <>
                    <CashFlowChart data={cashFlowData} />
                    <div className="flex items-center justify-center gap-5 mt-3 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Income</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" />Expense</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">No cash flow data</p>
                )}
              </SectionCard>
            </motion.div>
          </div>

          {/* Center Column: Projects + Activity */}
          <div className="lg:col-span-5 space-y-6">
            <motion.div variants={fadeUp}>
              <SectionCard
                title="Projects"
                icon={FolderKanban}
                iconColor="text-indigo-500"
                noPadding
                actions={
                  <button
                    onClick={() => router.push('/projects')}
                    className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                  >
                    View All <ArrowRight size={10} />
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
                    />
                  ))}
                </div>
              </SectionCard>
            </motion.div>

            <motion.div variants={fadeUp}>
              <SectionCard title={t.dashboard.recentActivity} icon={Clock} iconColor="text-blue-500" noPadding>
                {recentActivity.length > 0 ? (
                  <div className="divide-y divide-slate-100/80 dark:divide-slate-700/20">
                    {recentActivity.map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <div className={cn('p-1.5 rounded-lg bg-gradient-to-br text-white shrink-0', item.color)}>
                          <item.icon size={12} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{item.label}</div>
                          <div className="text-[10px] text-slate-400 truncate">{item.detail}</div>
                        </div>
                        <div className="text-[9px] text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
                          {formatDate(item.time)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8 px-6">No recent activity</p>
                )}
              </SectionCard>
            </motion.div>
          </div>

          {/* Right Column: Health + EVM + Insights */}
          <div className="lg:col-span-3 space-y-6">
            <motion.div variants={fadeUp}>
              <SectionCard title={t.dashboard.projectHealth} icon={Activity} iconColor="text-cyan-500">
                <div className="space-y-4">
                  {summaries.slice(0, 4).map(s => {
                    const progress = s.project.progress ?? 0
                    return (
                      <div key={s.project.id} className="flex items-center gap-3">
                        <ProgressRing
                          value={progress}
                          size={48}
                          strokeWidth={5}
                          color={progress >= 80 ? '#10b981' : progress >= 40 ? '#3b82f6' : '#f59e0b'}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 truncate">{s.project.name}</div>
                          <div className="text-[10px] text-slate-400">{progress.toFixed(0)}% complete</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </SectionCard>
            </motion.div>

            <motion.div variants={fadeUp}>
              <SectionCard title="EVM Performance" icon={Gauge} iconColor="text-indigo-500">
                {earnedValueData.length > 0 ? (
                  <div className="space-y-3">
                    {earnedValueData.slice(0, 3).map((ev, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]">
                        <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate mb-2">{ev.name}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-[9px] text-slate-400 uppercase">SPI</div>
                            <div className={cn('text-sm font-bold tabular-nums', ev.SPI >= 1 ? 'text-emerald-600' : ev.SPI >= 0.9 ? 'text-amber-600' : 'text-red-500')}>
                              {ev.SPI.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-400 uppercase">CPI</div>
                            <div className={cn('text-sm font-bold tabular-nums', ev.CPI >= 1 ? 'text-emerald-600' : ev.CPI >= 0.9 ? 'text-amber-600' : 'text-red-500')}>
                              {ev.CPI.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-6">No EVM data</p>
                )}
              </SectionCard>
            </motion.div>

            {/* AI Insights */}
            <motion.div variants={fadeUp}>
              <SectionCard title="Insights" icon={Sparkles} iconColor="text-amber-500">
                <div className="space-y-3">
                  {profitMargin !== 0 && (
                    <InsightCard
                      icon={profitMargin > 0 ? TrendingUp : TrendingDown}
                      title="Profit Margin"
                      value={`${profitMargin.toFixed(1)}%`}
                      subtitle={profitMargin > 10 ? 'Portfolio performing well' : profitMargin > 0 ? 'Margins are thin — review costs' : 'Portfolio at risk'}
                      gradient={profitMargin > 10 ? 'from-emerald-500 to-teal-500' : profitMargin > 0 ? 'from-amber-500 to-orange-500' : 'from-red-500 to-rose-500'}
                    />
                  )}
                  {pendingPayments > 0 && (
                    <InsightCard
                      icon={Clock}
                      title="Pending Payments"
                      value={fmtCompact(pendingPayments)}
                      subtitle="Awaiting client approval"
                      gradient="from-blue-500 to-indigo-500"
                    />
                  )}
                  {pendingVariations > 0 && (
                    <InsightCard
                      icon={AlertTriangle}
                      title="Pending Variations"
                      value={fmtCompact(pendingVariations)}
                      subtitle="Requires follow-up"
                      gradient="from-orange-500 to-red-500"
                    />
                  )}
                  {totalMeasurements > 0 && (
                    <InsightCard
                      icon={Ruler}
                      title="Measurements"
                      value={`${totalMeasurements} items`}
                      subtitle={`${totalMeasurementLines} calculation lines`}
                      gradient="from-violet-500 to-purple-500"
                    />
                  )}
                </div>
              </SectionCard>
            </motion.div>
          </div>
        </div>

        {/* ── Bottom: Financial Summary ── */}
        <motion.div variants={fadeUp}>
          <SectionCard title={t.dashboard.financialSummary} icon={DollarSign} iconColor="text-emerald-500">
            {summaries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/40">
                      <th className="pb-3 pr-4">Project</th>
                      <th className="pb-3 pr-4 text-right">Contract</th>
                      <th className="pb-3 pr-4 text-right">Variations</th>
                      <th className="pb-3 pr-4 text-right">Actual Cost</th>
                      <th className="pb-3 pr-4 text-right">Profit</th>
                      <th className="pb-3 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {summaries.map(s => {
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
                        <tr key={s.project.id} className="group cursor-pointer hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors" onClick={() => router.push(`/projects/${s.project.id}`)}>
                          <td className="py-3 pr-4">
                            <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{s.project.name}</div>
                          </td>
                          <td className="py-3 pr-4 text-right text-[12px] font-medium text-slate-600 dark:text-slate-300 tabular-nums">{fmtCompact(contractVal)}</td>
                          <td className="py-3 pr-4 text-right text-[12px] font-medium text-blue-500 tabular-nums">{varApproved > 0 ? `+${fmtCompact(varApproved)}` : '-'}</td>
                          <td className="py-3 pr-4 text-right text-[12px] font-medium text-rose-500 tabular-nums">{fmtCompact(actual)}</td>
                          <td className={cn('py-3 pr-4 text-right text-[12px] font-bold tabular-nums', profit >= 0 ? 'text-emerald-600' : 'text-red-500')}>{fmtCompact(profit)}</td>
                          <td className="py-3 text-right">
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold',
                              margin >= 10 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                              margin >= 0 ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                              'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
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
              <p className="text-sm text-slate-500 text-center py-8">No financial data</p>
            )}
          </SectionCard>
        </motion.div>
      </motion.div>
    </div>
  )
}
