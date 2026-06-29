'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  FolderKanban,
  Ruler,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  MapPin,
  Clock,
  ArrowUpRight,
  Users,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Activity,
  Percent,
  Plus,
  Eye,
  FileText,
  Layers,
  Building2,
  Briefcase,
  ArrowRight,
  Sparkles,
  Target,
  Wallet,
  FolderOpen,
} from 'lucide-react'
import { motion } from 'framer-motion'
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

  // Aggregate KPIs across all projects
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

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const fmtFull = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtCompact = (n: number) => {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return fmtFull(n)
  }
  const fmtPct = (n: number) => `${n.toFixed(2)}`

  // ── Earned Value computations per project ──
  const earnedValueData = useMemo(() => summaries
    .filter(s => s.contract)
    .map(s => {
      const BAC = s.contract!.contract_value
      // EV = % complete (from latest payment cert cumulative / contract) * BAC
      // Use progress from project or derive from payment certs
      const latestCert = s.paymentCerts.length > 0
        ? s.paymentCerts.reduce((best, c) => c.cert_number > best.cert_number ? c : best, s.paymentCerts[0])
        : null
      const percentComplete = latestCert
        ? (latestCert.gross_amount > 0 ? (latestCert.gross_amount / BAC) * 100 : 0)
        : (s.project.progress ?? 0)
      const EV = (percentComplete / 100) * BAC

      // PV = planned value (time-based). Use contract duration to estimate
      const contract = s.contract!
      let PV = BAC // default: assume we should be done
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

      return {
        name: s.project.name,
        BAC, EV, PV, AC, SPI, CPI, EAC, VAC,
        percentComplete,
      }
    }), [summaries])

  // ── Project Financial Summary data ──
  const financialData = useMemo(() => summaries.map(s => {
    const contractVal = s.contract?.contract_value ?? 0
    const varApproved = s.variations.filter(v => v.status === 'approved').reduce((a, b) => a + (b.approved_amount ?? b.amount), 0)
    const revisedValue = contractVal + varApproved
    const actual = s.costEntries.filter(c => c.category === 'actual').reduce((a, b) => a + b.amount, 0)
    const committed = s.costEntries.filter(c => c.category === 'committed').reduce((a, b) => a + b.amount, 0)
    const forecast = s.costEntries.filter(c => c.category === 'forecast').reduce((a, b) => a + b.amount, 0)
    const totalCost = actual + committed + forecast
    const profit = revisedValue - totalCost
    const margin = revisedValue > 0 ? (profit / revisedValue) * 100 : 0

    return {
      name: s.project.name,
      id: s.project.id,
      contractVal,
      varApproved,
      revisedValue,
      actual,
      committed,
      forecast: totalCost,
      profit,
      margin,
    }
  }), [summaries])

  // ── Cash Position data ──
  const cashSummary = useMemo(() => {
  const allCashflow = summaries.flatMap(s => s.cashflow)
  return allCashflow.length > 0 ? {
    plannedIncome: allCashflow.reduce((s, c) => s + c.planned_income, 0),
    actualIncome: allCashflow.reduce((s, c) => s + c.actual_income, 0),
    plannedExpense: allCashflow.reduce((s, c) => s + c.planned_expense, 0),
    actualExpense: allCashflow.reduce((s, c) => s + c.actual_expense, 0),
  } : null
  }, [summaries])

  // Completion rate across projects
  const completionRate = useMemo(() => {
    if (projects.length === 0) return 0
    return projects.reduce((sum, p) => sum + (p.progress ?? 0), 0) / projects.length
  }, [projects])

  // Budget breakdown for donut chart
  const budgetSegments = useMemo(() => [
    { value: totalActualCost, color: '#f43f5e', label: 'Actual Cost' },
    { value: totalCommitted, color: '#f59e0b', label: 'Committed' },
    { value: Math.max(0, totalContractValue - totalActualCost - totalCommitted), color: '#10b981', label: 'Remaining' },
  ].filter(s => s.value > 0), [totalActualCost, totalCommitted, totalContractValue])

  // Recent activity timeline
  const recentActivity = useMemo(() => {
    const items: { label: string; detail: string; time: string; color: string }[] = []
    for (const s of summaries) {
      for (const cert of s.paymentCerts.slice(-2)) {
        items.push({
          label: `Payment ${cert.status === 'paid' ? 'completed' : 'submitted'}`,
          detail: `${s.project.name} - IPC #${cert.cert_number}`,
          time: cert.created_at ?? s.project.updated_at,
          color: cert.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500',
        })
      }
      for (const v of s.variations.slice(-2)) {
        items.push({
          label: `Variation ${v.status}`,
          detail: `${s.project.name} - ${v.title ?? v.variation_no}`,
          time: v.created_at ?? s.project.updated_at,
          color: v.status === 'approved' ? 'bg-blue-500' : 'bg-orange-500',
        })
      }
    }
    return items
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 6)
  }, [summaries])

  // Stagger animation container
  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
  }
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-10 w-64 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {[1,2,3,4,5].map(i => (
              <CardSkeleton key={i} />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {[1,2,3].map(i => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <AlertTriangle size={40} className="text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Dashboard Unavailable</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (summaries.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <PageHeader
            icon={Activity}
            title={t.dashboard.title}
            subtitle={t.dashboard.subtitle}
            gradient="from-indigo-500 to-indigo-600"
          />
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <motion.div
        className="mx-auto max-w-7xl space-y-6 p-6 md:p-8"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* ── Page Header ── */}
        <motion.div variants={fadeUp}>
          <PageHeader
            icon={Activity}
            title={t.dashboard.title}
            subtitle={t.dashboard.subtitle}
            gradient="from-indigo-500 to-indigo-600"
            actions={
              <button
                onClick={() => router.push('/projects')}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:brightness-110"
              >
                <Plus size={16} />
                New Project
              </button>
            }
          />
        </motion.div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-5">
          {([
            { label: t.dashboard.totalProjects, value: totalProjects, icon: FolderKanban, gradient: 'from-violet-600 to-indigo-600' },
            { label: t.dashboard.totalBudget, value: totalContractValue, icon: Briefcase, gradient: 'from-blue-600 to-cyan-600', prefix: '$', decimals: 2 },
            { label: t.dashboard.activeTenders, value: activeTenders, icon: Receipt, gradient: 'from-purple-600 to-fuchsia-600' },
            { label: t.dashboard.totalPayments, value: totalPaid, icon: DollarSign, gradient: 'from-emerald-600 to-teal-600', prefix: '$', decimals: 2 },
            { label: 'Completion Rate', value: completionRate, icon: Target, gradient: 'from-amber-600 to-orange-600', suffix: '%', decimals: 1 },
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
              />
            </motion.div>
          ))}
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column (wider) */}
          <div className="space-y-6 lg:col-span-2">
            {/* Budget Overview */}
            <motion.div variants={fadeUp}>
              <SectionCard title={t.dashboard.budgetOverview} icon={Layers} iconColor="text-rose-500">
                {budgetSegments.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <DonutChart segments={budgetSegments} size={200} showLegend />
                    <div className="mt-4 grid grid-cols-3 gap-4 w-full text-center">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Actual</div>
                        <div className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">{fmtCompact(totalActualCost)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Committed</div>
                        <div className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">{fmtCompact(totalCommitted)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Remaining</div>
                        <div className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmtCompact(Math.max(0, totalContractValue - totalActualCost - totalCommitted))}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">No budget data available</p>
                )}
              </SectionCard>
            </motion.div>

            {/* Recent Activity */}
            <motion.div variants={fadeUp}>
              <SectionCard title={t.dashboard.recentActivity} icon={Clock} iconColor="text-blue-500" noPadding>
                {recentActivity.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/30">
                    {recentActivity.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 px-6 py-3">
                        <div className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', item.color)} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.detail}</div>
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
                          {formatDate(item.time)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8 px-6">No recent activity</p>
                )}
              </SectionCard>
            </motion.div>
          </div>

          {/* Right column (narrower) */}
          <div className="space-y-6">
            {/* Project Health */}
            <motion.div variants={fadeUp}>
              <SectionCard title={t.dashboard.projectHealth} icon={Activity} iconColor="text-cyan-500">
                <div className="flex flex-wrap justify-center gap-6">
                  {summaries.map(s => (
                    <ProgressRing
                      key={s.project.id}
                      value={s.project.progress ?? 0}
                      size={72}
                      color={
                        (s.project.progress ?? 0) >= 100
                          ? '#10b981'
                          : (s.project.progress ?? 0) > 50
                            ? '#3b82f6'
                            : '#f59e0b'
                      }
                      label={s.project.name.length > 10 ? s.project.name.slice(0, 10) + '...' : s.project.name}
                    />
                  ))}
                </div>
              </SectionCard>
            </motion.div>

            {/* EVM Summary */}
            <motion.div variants={fadeUp}>
              <SectionCard title="EVM Summary" icon={BarChart3} iconColor="text-indigo-500">
                {earnedValueData.length > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">SPI by Project</div>
                      <SimpleBarChart
                        bars={earnedValueData.map(ev => ({
                          label: ev.name.length > 12 ? ev.name.slice(0, 12) + '...' : ev.name,
                          value: parseFloat(ev.SPI.toFixed(2)),
                          color: ev.SPI >= 1 ? '#10b981' : ev.SPI >= 0.9 ? '#f59e0b' : '#f43f5e',
                        }))}
                        horizontal
                      />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">CPI by Project</div>
                      <SimpleBarChart
                        bars={earnedValueData.map(ev => ({
                          label: ev.name.length > 12 ? ev.name.slice(0, 12) + '...' : ev.name,
                          value: parseFloat(ev.CPI.toFixed(2)),
                          color: ev.CPI >= 1 ? '#10b981' : ev.CPI >= 0.9 ? '#f59e0b' : '#f43f5e',
                        }))}
                        horizontal
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">No EVM data available</p>
                )}
              </SectionCard>
            </motion.div>
          </div>
        </div>

        {/* ── Bottom Row: Financial Summary ── */}
        <motion.div variants={fadeUp}>
          <SectionCard title={t.dashboard.financialSummary} icon={DollarSign} iconColor="text-emerald-500">
            <SimpleBarChart
              bars={financialData.map(d => ({
                label: d.name.length > 15 ? d.name.slice(0, 15) + '...' : d.name,
                value: d.revisedValue,
                color: '#3b82f6',
              }))}
              horizontal
            />
            <div className="mt-4">
              <SimpleBarChart
                bars={financialData.map(d => ({
                  label: d.name.length > 15 ? d.name.slice(0, 15) + '...' : d.name,
                  value: d.actual,
                  color: '#f43f5e',
                }))}
                horizontal
              />
            </div>
            <div className="mt-3 flex items-center justify-center gap-6 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Budget (Revised)</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />Actual Cost</span>
            </div>
          </SectionCard>
        </motion.div>
      </motion.div>
    </div>
  )
}
