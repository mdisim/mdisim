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
} from 'lucide-react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { getDashboardSummaries } from '@/app/actions/dashboard'
import type { ProjectSummary } from '@/app/actions/dashboard'
import type { Project } from '@/lib/types'

export default function DashboardPage() {
  const router = useRouter()
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-28 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-pulse" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {[1,2].map(i => (
              <div key={i} className="h-64 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-pulse" />
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Executive Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Portfolio overview across {totalProjects} project{totalProjects !== 1 ? 's' : ''}
            </p>
          </div>
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/projects')}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:brightness-110"
            >
              <Plus size={16} />
              New Project
            </button>
          </div>
        </div>

        {/* Portfolio KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {([
            {
              label: 'Total Projects',
              value: loading ? '...' : String(totalProjects),
              subtitle: `${summaries.filter(s => (s.project.progress ?? 0) > 0 && (s.project.progress ?? 0) < 100).length} in progress`,
              icon: FolderKanban,
              gradient: 'from-violet-600 to-indigo-600',
            },
            {
              label: 'Contract Value',
              value: loading ? '...' : fmtCompact(totalContractValue),
              subtitle: 'Total portfolio',
              icon: Briefcase,
              gradient: 'from-blue-600 to-cyan-600',
            },
            {
              label: 'BOQ Value',
              value: loading ? '...' : fmtCompact(totalBOQValue),
              subtitle: `${summaries.reduce((s, p) => s + p.boqItems.length, 0)} line items`,
              icon: FileSpreadsheet,
              gradient: 'from-emerald-600 to-teal-600',
            },
            {
              label: 'Actual Cost',
              value: loading ? '...' : fmtCompact(totalActualCost),
              subtitle: totalContractValue > 0 ? `${((totalActualCost / totalContractValue) * 100).toFixed(1)}% of contract` : 'No contract set',
              icon: DollarSign,
              gradient: 'from-rose-600 to-pink-600',
            },
            {
              label: 'Forecast Cost',
              value: loading ? '...' : fmtCompact(totalForecastCost),
              subtitle: totalContractValue > 0 ? `${((totalForecastCost / totalContractValue) * 100).toFixed(1)}% of contract` : 'N/A',
              icon: Target,
              gradient: 'from-amber-600 to-orange-600',
            },
            {
              label: 'Projected Profit',
              value: loading ? '...' : fmtCompact(projectedProfit),
              subtitle: totalContractValue > 0 ? `${profitMargin.toFixed(1)}% margin` : 'N/A',
              icon: projectedProfit >= 0 ? TrendingUp : TrendingDown,
              gradient: projectedProfit >= 0 ? 'from-green-600 to-emerald-600' : 'from-red-600 to-rose-600',
            },
          ]).map((kpi, index) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className={cn(
                'relative overflow-hidden rounded-xl bg-gradient-to-br p-4 shadow-lg',
                kpi.gradient
              )}
            >
              {/* Background icon watermark */}
              <kpi.icon
                size={80}
                className="absolute -right-3 -top-3 rotate-12 opacity-[0.08] text-white"
                strokeWidth={1}
              />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-lg bg-white/20 dark:bg-white/15 p-1.5 backdrop-blur-sm">
                    <kpi.icon size={16} className="text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold tabular-nums text-white tracking-tight">
                  {kpi.value}
                </div>
                <div className="text-[11px] font-medium text-white/70 mt-0.5">{kpi.label}</div>
                <div className="text-[10px] text-white/50 mt-0.5">{kpi.subtitle}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Secondary KPI Strip */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {([
            { label: 'Total Paid', value: fmtCompact(totalPaid), icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', dotColor: 'bg-emerald-500 dark:bg-emerald-400' },
            { label: 'Pending Payments', value: fmtCompact(pendingPayments), icon: Clock, color: 'text-amber-600 dark:text-amber-400', dotColor: 'bg-amber-500 dark:bg-amber-400' },
            { label: 'Approved VOs', value: fmtCompact(approvedVariations), icon: CheckCircle2, color: 'text-blue-600 dark:text-blue-400', dotColor: 'bg-blue-500 dark:bg-blue-400' },
            { label: 'Pending VOs', value: fmtCompact(pendingVariations), icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', dotColor: 'bg-orange-500 dark:bg-orange-400' },
            { label: 'Active Tenders', value: fmt(activeTenders), icon: Receipt, color: 'text-purple-600 dark:text-purple-400', dotColor: 'bg-purple-500 dark:bg-purple-400' },
            { label: 'Measurements', value: `${fmt(totalMeasurements)}`, icon: Ruler, color: 'text-sky-600 dark:text-sky-400', dotColor: 'bg-sky-500 dark:bg-sky-400' },
          ] as const).map(kpi => (
            <div
              key={kpi.label}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-3 shadow-sm dark:shadow-none"
            >
              <div className="flex items-center gap-2">
                <div className={cn('h-1.5 w-1.5 rounded-full', kpi.dotColor)} />
                <span className={cn('text-sm font-bold tabular-nums', kpi.color)}>
                  {loading ? '...' : kpi.value}
                </span>
              </div>
              <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {kpi.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Charts ── */}
        {!loading && summaries.length > 0 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Portfolio Cost Breakdown */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm dark:shadow-none">
                <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-rose-600 dark:text-rose-400" />
                    <CardTitle className="text-slate-900 dark:text-slate-100">Portfolio Cost Breakdown</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Actual Cost', value: totalActualCost },
                          { name: 'Committed', value: totalCommitted },
                          { name: 'Remaining Budget', value: Math.max(0, totalContractValue - totalActualCost - totalCommitted) },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${fmtCompact(value)}`}
                      >
                        <Cell fill="#f43f5e" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#10b981" />
                      </Pie>
                      <Tooltip formatter={(value) => fmtCompact(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 flex items-center justify-center gap-6 text-xs">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />Actual Cost</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" />Committed</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Remaining</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Project Health Overview */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}>
              <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm dark:shadow-none">
                <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={18} className="text-blue-600 dark:text-blue-400" />
                    <CardTitle className="text-slate-900 dark:text-slate-100">Project Health Overview</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={financialData.map(d => ({
                        name: d.name.length > 12 ? d.name.slice(0, 12) + '...' : d.name,
                        'Contract Value': d.contractVal,
                        'Actual Cost': d.actual,
                        'Forecast': d.forecast,
                      }))}
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'currentColor' }} className="text-slate-500 dark:text-slate-400" />
                      <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 10, fill: 'currentColor' }} className="text-slate-500 dark:text-slate-400" />
                      <Tooltip formatter={(value) => fmtCompact(Number(value))} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Contract Value" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Actual Cost" fill="#f43f5e" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Forecast" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* ── Earned Value Metrics ── */}
        {!loading && earnedValueData.length > 0 && (
          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm dark:shadow-none">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-cyan-600 dark:text-cyan-400" />
                <CardTitle className="text-slate-900 dark:text-slate-100">Earned Value Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3 text-right">BAC</th>
                      <th className="px-4 py-3 text-right">% Comp</th>
                      <th className="px-4 py-3 text-right">EV</th>
                      <th className="px-4 py-3 text-right">PV</th>
                      <th className="px-4 py-3 text-right">AC</th>
                      <th className="px-4 py-3 text-right">SPI</th>
                      <th className="px-4 py-3 text-right">CPI</th>
                      <th className="px-4 py-3 text-right">EAC</th>
                      <th className="px-4 py-3 text-right">VAC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnedValueData.map((ev, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-100 dark:border-slate-700/20 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/20"
                      >
                        <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200 max-w-[200px] truncate">{ev.name}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{fmtCompact(ev.BAC)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{fmtPct(ev.percentComplete)}%</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{fmtCompact(ev.EV)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{fmtCompact(ev.PV)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{fmtCompact(ev.AC)}</td>
                        <td className={cn(
                          'px-4 py-2.5 text-right tabular-nums font-semibold',
                          ev.SPI >= 1 ? 'text-emerald-600 dark:text-emerald-400' : ev.SPI >= 0.9 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                        )}>
                          {fmtPct(ev.SPI)}
                        </td>
                        <td className={cn(
                          'px-4 py-2.5 text-right tabular-nums font-semibold',
                          ev.CPI >= 1 ? 'text-emerald-600 dark:text-emerald-400' : ev.CPI >= 0.9 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                        )}>
                          {fmtPct(ev.CPI)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{fmtCompact(ev.EAC)}</td>
                        <td className={cn(
                          'px-4 py-2.5 text-right tabular-nums font-semibold',
                          ev.VAC >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        )}>
                          {fmtCompact(ev.VAC)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-200 dark:border-slate-700 px-4 py-2.5 text-[10px] text-slate-500">
                <span>BAC = Budget at Completion</span>
                <span>EV = Earned Value</span>
                <span>PV = Planned Value</span>
                <span>AC = Actual Cost</span>
                <span>SPI = Schedule Perf. Index</span>
                <span>CPI = Cost Perf. Index</span>
                <span>EAC = Estimate at Completion</span>
                <span>VAC = Variance at Completion</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Project Financial Summary ── */}
        {!loading && summaries.length > 0 && (
          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm dark:shadow-none">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-slate-900 dark:text-slate-100">Project Financial Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3 text-right">Contract</th>
                      <th className="px-4 py-3 text-right">Approved VOs</th>
                      <th className="px-4 py-3 text-right">Revised Value</th>
                      <th className="px-4 py-3 text-right">Actual Cost</th>
                      <th className="px-4 py-3 text-right">Committed</th>
                      <th className="px-4 py-3 text-right">Forecast Total</th>
                      <th className="px-4 py-3 text-right">Profit</th>
                      <th className="px-4 py-3 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialData.map(row => (
                      <tr
                        key={row.id}
                        role="row"
                        tabIndex={0}
                        className="border-b border-slate-100 dark:border-slate-700/20 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/20 cursor-pointer"
                        onClick={() => router.push(`/projects/${row.id}/measurements`)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/projects/${row.id}/measurements`) } }}
                      >
                        <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200 max-w-[200px] truncate">{row.name}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{row.contractVal > 0 ? fmtCompact(row.contractVal) : '-'}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-blue-600 dark:text-blue-400">{row.varApproved > 0 ? fmtCompact(row.varApproved) : '-'}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200 font-semibold">{row.revisedValue > 0 ? fmtCompact(row.revisedValue) : '-'}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-rose-600 dark:text-rose-400">{row.actual > 0 ? fmtCompact(row.actual) : '-'}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-amber-600 dark:text-amber-400">{row.committed > 0 ? fmtCompact(row.committed) : '-'}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{row.forecast > 0 ? fmtCompact(row.forecast) : '-'}</td>
                        <td className={cn(
                          'px-4 py-2.5 text-right tabular-nums font-semibold',
                          row.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        )}>
                          {row.revisedValue > 0 ? fmtCompact(row.profit) : '-'}
                        </td>
                        <td className={cn(
                          'px-4 py-2.5 text-right tabular-nums font-semibold',
                          row.margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        )}>
                          {row.revisedValue > 0 ? `${row.margin.toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals row */}
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 dark:border-slate-600/50 bg-slate-50 dark:bg-slate-800/80 font-semibold">
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">Portfolio Total</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{fmtCompact(financialData.reduce((s, r) => s + r.contractVal, 0))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-blue-600 dark:text-blue-400">{fmtCompact(financialData.reduce((s, r) => s + r.varApproved, 0))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-900 dark:text-slate-100">{fmtCompact(financialData.reduce((s, r) => s + r.revisedValue, 0))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-rose-600 dark:text-rose-400">{fmtCompact(financialData.reduce((s, r) => s + r.actual, 0))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-amber-600 dark:text-amber-400">{fmtCompact(financialData.reduce((s, r) => s + r.committed, 0))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{fmtCompact(financialData.reduce((s, r) => s + r.forecast, 0))}</td>
                      <td className={cn(
                        'px-4 py-2.5 text-right tabular-nums',
                        financialData.reduce((s, r) => s + r.profit, 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      )}>
                        {fmtCompact(financialData.reduce((s, r) => s + r.profit, 0))}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
                        {(() => {
                          const totalRev = financialData.reduce((s, r) => s + r.revisedValue, 0)
                          const totalProf = financialData.reduce((s, r) => s + r.profit, 0)
                          return totalRev > 0 ? `${((totalProf / totalRev) * 100).toFixed(1)}%` : '-'
                        })()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Cash Position ── */}
        {!loading && cashSummary && (
          <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm dark:shadow-none">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-slate-900 dark:text-slate-100">Cash Position</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {([
                  { label: 'Planned Income', value: cashSummary.plannedIncome, color: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Actual Income', value: cashSummary.actualIncome, color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Planned Expense', value: cashSummary.plannedExpense, color: 'text-amber-600 dark:text-amber-400' },
                  { label: 'Actual Expense', value: cashSummary.actualExpense, color: 'text-rose-600 dark:text-rose-400' },
                ]).map(item => (
                  <div key={item.label} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{item.label}</div>
                    <div className={cn('mt-1 text-lg font-bold tabular-nums', item.color)}>
                      {fmtCompact(item.value)}
                    </div>
                  </div>
                ))}
              </div>
              {/* Net position */}
              <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50 px-4 py-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Net Cash Position (Actual Income - Actual Expense)</span>
                <span className={cn(
                  'text-lg font-bold tabular-nums',
                  (cashSummary.actualIncome - cashSummary.actualExpense) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                )}>
                  {fmtCompact(cashSummary.actualIncome - cashSummary.actualExpense)}
                </span>
              </div>
              {/* Variance bars */}
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Income Variance</div>
                  <div className={cn(
                    'mt-1 text-sm font-bold tabular-nums',
                    (cashSummary.actualIncome - cashSummary.plannedIncome) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  )}>
                    {fmtCompact(cashSummary.actualIncome - cashSummary.plannedIncome)}
                    <span className="ml-1 text-[10px] font-normal text-slate-500">
                      ({cashSummary.plannedIncome > 0 ? `${(((cashSummary.actualIncome - cashSummary.plannedIncome) / cashSummary.plannedIncome) * 100).toFixed(1)}%` : 'N/A'})
                    </span>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Expense Variance</div>
                  <div className={cn(
                    'mt-1 text-sm font-bold tabular-nums',
                    (cashSummary.actualExpense - cashSummary.plannedExpense) <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  )}>
                    {fmtCompact(cashSummary.actualExpense - cashSummary.plannedExpense)}
                    <span className="ml-1 text-[10px] font-normal text-slate-500">
                      ({cashSummary.plannedExpense > 0 ? `${(((cashSummary.actualExpense - cashSummary.plannedExpense) / cashSummary.plannedExpense) * 100).toFixed(1)}%` : 'N/A'})
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Project Cards Section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Projects</h2>
              <span className="rounded-full bg-slate-200 dark:bg-slate-700/50 px-2.5 py-0.5 text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
                {totalProjects}
              </span>
            </div>
            {projects.length > 0 && (
              <button
                onClick={() => router.push('/projects')}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white"
              >
                View all <ArrowUpRight size={12} />
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="h-56 animate-pulse rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              ))}
            </div>
          ) : summaries.length === 0 ? (
            /* Premium Empty State */
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800/80 dark:to-slate-900/80 px-8 py-16 text-center shadow-sm dark:shadow-none">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/5 dark:from-blue-600/10 via-transparent to-transparent" />
              <div className="relative z-10">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 ring-1 ring-blue-500/20">
                  <Building2 size={36} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Start Your First Project</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  Create a project to begin managing BOQs, measurements, cost control, and payment certificates -- all in one place.
                </p>
                <div className="mt-8 flex items-center justify-center gap-3">
                  <button
                    onClick={() => router.push('/projects')}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40"
                  >
                    <Plus size={16} />
                    Create Project
                  </button>
                </div>
                <div className="mt-8 grid grid-cols-3 gap-6 border-t border-slate-200 dark:border-slate-700 pt-8">
                  {[
                    { icon: FileSpreadsheet, label: 'Bill of Quantities', desc: 'Structured BOQ management' },
                    { icon: Ruler, label: 'Measurements', desc: 'Accurate quantity tracking' },
                    { icon: BarChart3, label: 'Cost Control', desc: 'Budget & forecast analytics' },
                  ].map(f => (
                    <div key={f.label} className="text-center">
                      <f.icon size={20} className="mx-auto mb-2 text-slate-400 dark:text-slate-500" />
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{f.label}</div>
                      <div className="mt-0.5 text-[10px] text-slate-500">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {summaries.map(s => {
                const boqTotal = s.boqItems.reduce((a, b) => a + (b.total_amount ?? 0), 0)
                const contractVal = s.contract?.contract_value ?? 0
                const actual = s.costEntries.filter(c => c.category === 'actual').reduce((a, b) => a + b.amount, 0)
                const paid = s.paymentCerts.filter(c => c.status === 'paid').reduce((a, b) => a + b.net_payable, 0)
                const varApproved = s.variations.filter(v => v.status === 'approved').reduce((a, b) => a + (b.approved_amount ?? b.amount), 0)
                const progress = s.project.progress ?? 0
                const statusColor = progress >= 100
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20'
                  : progress > 0
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/20'
                    : 'bg-slate-500/15 text-slate-500 dark:text-slate-400 ring-slate-500/20'
                const statusLabel = progress >= 100 ? 'Complete' : progress > 0 ? 'In Progress' : 'Not Started'

                return (
                  <div
                    key={s.project.id}
                    className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm dark:shadow-none transition-all hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5"
                  >
                    {/* Card Header */}
                    <div className="border-b border-slate-200 dark:border-slate-700/30 p-4 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {s.project.name}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {s.project.client_name && (
                              <span className="flex items-center gap-1">
                                <Users size={10} className="text-slate-400 dark:text-slate-500" />
                                {s.project.client_name}
                              </span>
                            )}
                            {s.project.location && (
                              <span className="flex items-center gap-1">
                                <MapPin size={10} className="text-slate-400 dark:text-slate-500" />
                                {s.project.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={cn(
                          'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
                          statusColor
                        )}>
                          {statusLabel}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span>Progress</span>
                          <span className="font-semibold tabular-nums text-slate-600 dark:text-slate-300">{progress}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700/50">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              progress >= 100
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : progress > 50
                                  ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                                  : 'bg-gradient-to-r from-blue-600 to-blue-400'
                            )}
                            style={{ width: `${Math.min(100, Math.max(progress, 0))}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="p-4 pt-3">
                      <div className="space-y-1.5 text-xs">
                        {contractVal > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Contract</span>
                            <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{fmtFull(contractVal)}</span>
                          </div>
                        )}
                        {boqTotal > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">BOQ Total</span>
                            <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{fmtFull(boqTotal)}</span>
                          </div>
                        )}
                        {actual > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Actual Cost</span>
                            <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">{fmtFull(actual)}</span>
                          </div>
                        )}
                        {paid > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Paid</span>
                            <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{fmtFull(paid)}</span>
                          </div>
                        )}
                        {varApproved > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Approved VOs</span>
                            <span className="font-semibold tabular-nums text-blue-600 dark:text-blue-400">{fmtFull(varApproved)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer with stats + action buttons */}
                    <div className="border-t border-slate-200 dark:border-slate-700/30 px-4 py-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-[10px] tabular-nums text-slate-500">
                          <span>{s.boqItems.length} BOQ</span>
                          <span>{s.measurementItems.length} Meas</span>
                          <span>{s.paymentCerts.length} IPC</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/projects/${s.project.id}/measurements`) }}
                            className="rounded-md px-2 py-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 transition-colors hover:bg-blue-500/10"
                            title="Open"
                          >
                            Open
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/projects/${s.project.id}/boq`) }}
                            className="rounded-md px-2 py-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-500/10 hover:text-slate-700 dark:hover:text-slate-300"
                            title="BOQ"
                          >
                            BOQ
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/projects/${s.project.id}/drawings`) }}
                            className="rounded-md px-2 py-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-500/10 hover:text-slate-700 dark:hover:text-slate-300"
                            title="Drawings"
                          >
                            Dwg
                          </button>
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-600">
                        <Clock size={9} />
                        <span>Updated {formatDate(s.project.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
