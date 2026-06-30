'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import type { Contract, CostEntry, PaymentCert } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TableSkeleton } from '@/components/ui/skeleton'
import { getContract, getCostEntries } from '@/app/actions/cost-control'
import { getPaymentCerts } from '@/app/actions/payments'
import { getProject } from '@/app/actions/projects'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Target,
  Calculator,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'

// ── Helpers ──────────────────────────────────────────────────────────────

function fmt(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function fmtPct(value: number): string {
  return (value * 100).toFixed(1) + '%'
}

function fmtIdx(value: number): string {
  return value.toFixed(2)
}

function monthsBetween(start: string, end: string): string[] {
  const months: string[] = []
  const s = new Date(start)
  const e = new Date(end)
  const cur = new Date(s.getFullYear(), s.getMonth(), 1)
  while (cur <= e) {
    months.push(cur.toISOString().slice(0, 7))
    cur.setMonth(cur.getMonth() + 1)
  }
  return months
}

function getHealthStatus(
  spi: number,
  cpi: number,
  labels: { onTrack: string; critical: string; overBudget: string; behindSchedule: string; atRisk: string },
): { label: string; color: string; icon: typeof CheckCircle2 } {
  if (spi >= 1 && cpi >= 1) return { label: labels.onTrack, color: 'text-green-600 bg-green-50 dark:bg-green-900/30', icon: CheckCircle2 }
  if (spi < 0.9 && cpi < 0.9) return { label: labels.critical, color: 'text-red-600 bg-red-50 dark:bg-red-900/30', icon: XCircle }
  if (cpi < 1) return { label: labels.overBudget, color: 'text-red-600 bg-red-50 dark:bg-red-900/30', icon: AlertTriangle }
  if (spi < 1) return { label: labels.behindSchedule, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30', icon: Clock }
  return { label: labels.atRisk, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30', icon: AlertTriangle }
}

// ── EVM Computation ──────────────────────────────────────────────────────

interface EVMData {
  bac: number
  ev: number
  pv: number
  ac: number
  spi: number
  cpi: number
  sv: number
  cv: number
  eac_cpi: number
  eac_linear: number
  eac_combined: number
  etc: number
  vac: number
  tcpi: number
  months: string[]
  pvCurve: number[]
  evCurve: number[]
  acCurve: number[]
  currency: string
}

function computeEVM(
  contract: Contract,
  costEntries: CostEntry[],
  paymentCerts: PaymentCert[],
  currency: string,
): EVMData {
  const bac = contract.contract_value
  const startDate = contract.start_date ?? new Date().toISOString().slice(0, 10)
  const endDate = contract.end_date ?? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
  const months = monthsBetween(startDate, endDate)
  const totalMonths = months.length || 1

  // PV curve: linear distribution of BAC over project duration
  const pvCurve = months.map((_, i) => (bac / totalMonths) * (i + 1))

  // EV curve from payment certificates (cumulative gross_amount per month)
  const certsByMonth = new Map<string, number>()
  paymentCerts.forEach((pc) => {
    const m = pc.period_to.slice(0, 7)
    certsByMonth.set(m, (certsByMonth.get(m) ?? 0) + pc.current_gross)
  })
  let cumEv = 0
  const evCurve = months.map((m) => {
    cumEv += certsByMonth.get(m) ?? 0
    return cumEv
  })

  // AC curve from cost entries (cumulative per month)
  const costsByMonth = new Map<string, number>()
  costEntries.forEach((ce) => {
    const m = ce.period_date.slice(0, 7)
    costsByMonth.set(m, (costsByMonth.get(m) ?? 0) + ce.amount)
  })
  let cumAc = 0
  const acCurve = months.map((m) => {
    cumAc += costsByMonth.get(m) ?? 0
    return cumAc
  })

  // Current period: find latest month with data
  const now = new Date().toISOString().slice(0, 7)
  let currentIdx = months.findIndex((m) => m >= now)
  if (currentIdx === -1) currentIdx = months.length - 1
  if (currentIdx < 0) currentIdx = 0

  const ev = evCurve[currentIdx] ?? 0
  const pv = pvCurve[currentIdx] ?? 0
  const ac = acCurve[currentIdx] ?? 0

  const spi = pv > 0 ? ev / pv : 0
  const cpi = ac > 0 ? ev / ac : 0
  const sv = ev - pv
  const cv = ev - ac
  const eac_cpi = cpi > 0 ? bac / cpi : bac
  const eac_linear = ac + (bac - ev)
  const eac_combined = cpi > 0 ? ac + (bac - ev) / cpi : bac
  const etc = eac_cpi - ac
  const vac = bac - eac_cpi
  const tcpi = (bac - ac) !== 0 ? (bac - ev) / (bac - ac) : 0

  return { bac, ev, pv, ac, spi, cpi, sv, cv, eac_cpi, eac_linear, eac_combined, etc, vac, tcpi, months, pvCurve, evCurve, acCurve, currency }
}

// ── SVG S-Curve Chart ────────────────────────────────────────────────────

function SCurveChart({ evm, legend }: { evm: EVMData; legend: { pv: string; ev: string; ac: string } }) {
  const W = 700, H = 320, PAD = { top: 20, right: 30, bottom: 50, left: 70 }
  const cw = W - PAD.left - PAD.right
  const ch = H - PAD.top - PAD.bottom

  const allValues = [...evm.pvCurve, ...evm.evCurve, ...evm.acCurve]
  const maxY = Math.max(...allValues, 1)
  const n = evm.months.length

  function x(i: number) { return PAD.left + (i / Math.max(n - 1, 1)) * cw }
  function y(v: number) { return PAD.top + ch - (v / maxY) * ch }

  function polyline(data: number[]) {
    return data.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  }

  // Show ~6 x-axis labels
  const step = Math.max(1, Math.floor(n / 6))

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[700px] min-w-[500px]">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={PAD.left} x2={W - PAD.right} y1={y(maxY * f)} y2={y(maxY * f)}
            stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeDasharray="4,4" />
        ))}
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text key={f} x={PAD.left - 8} y={y(maxY * f) + 4} textAnchor="end"
            className="fill-slate-500 dark:fill-slate-400" fontSize={10}>
            {fmt(maxY * f, evm.currency)}
          </text>
        ))}
        {/* X-axis labels */}
        {evm.months.map((m, i) => i % step === 0 ? (
          <text key={m} x={x(i)} y={H - 10} textAnchor="middle"
            className="fill-slate-500 dark:fill-slate-400" fontSize={9}>
            {m}
          </text>
        ) : null)}
        {/* Curves */}
        <polyline points={polyline(evm.pvCurve)} fill="none" stroke="#3b82f6" strokeWidth={2.5} />
        <polyline points={polyline(evm.evCurve)} fill="none" stroke="#22c55e" strokeWidth={2.5} />
        <polyline points={polyline(evm.acCurve)} fill="none" stroke="#ef4444" strokeWidth={2.5} />
      </svg>
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2 text-xs font-medium">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 inline-block rounded" /> {legend.pv}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-green-500 inline-block rounded" /> {legend.ev}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-500 inline-block rounded" /> {legend.ac}</span>
      </div>
    </div>
  )
}

// ── Performance Indices Bar Chart ────────────────────────────────────────

function IndicesChart({ spi, cpi }: { spi: number; cpi: number }) {
  const W = 300, H = 200, PAD = { top: 20, right: 20, bottom: 30, left: 40 }
  const ch = H - PAD.top - PAD.bottom
  const barW = 50
  const maxVal = Math.max(spi, cpi, 1.5)

  function yPos(v: number) { return PAD.top + ch - (v / maxVal) * ch }

  const bars = [
    { label: 'SPI', value: spi, x: PAD.left + 40 },
    { label: 'CPI', value: cpi, x: PAD.left + 140 },
  ]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[300px]">
      {/* Reference line at 1.0 */}
      <line x1={PAD.left} x2={W - PAD.right} y1={yPos(1)} y2={yPos(1)}
        stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="6,3" />
      <text x={PAD.left - 6} y={yPos(1) + 4} textAnchor="end" fontSize={10}
        className="fill-slate-500 dark:fill-slate-400">1.0</text>

      {bars.map((b) => {
        const barH = (b.value / maxVal) * ch
        const color = b.value >= 1 ? '#22c55e' : '#ef4444'
        return (
          <g key={b.label}>
            <rect x={b.x} y={yPos(b.value)} width={barW} height={barH} rx={4} fill={color} opacity={0.85} />
            <text x={b.x + barW / 2} y={yPos(b.value) - 6} textAnchor="middle" fontSize={12}
              className="fill-slate-700 dark:fill-slate-200 font-semibold">{fmtIdx(b.value)}</text>
            <text x={b.x + barW / 2} y={H - 8} textAnchor="middle" fontSize={11}
              className="fill-slate-500 dark:fill-slate-400 font-medium">{b.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────

export default function EVMPage() {
  const { t } = useI18n()
  const { id: projectId } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [evm, setEvm] = useState<EVMData | null>(null)
  const [hasContract, setHasContract] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [project, contract, costEntries, paymentCerts] = await Promise.all([
        getProject(projectId),
        getContract(projectId),
        getCostEntries(projectId),
        getPaymentCerts(projectId),
      ])
      if (!contract) {
        setHasContract(false)
        setEvm(null)
      } else {
        setHasContract(true)
        setEvm(computeEVM(contract, costEntries, paymentCerts, project?.currency ?? 'USD'))
      }
    } catch {
      setError(t.evm.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [projectId, t.evm.loadFailed])

  useEffect(() => { load() }, [load])

  // ── Loading ──
  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.evm.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.evm.loadingAnalysis}</p>
          </div>
        </div>
        <TableSkeleton rows={6} columns={4} />
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{error}</h3>
          <Button onClick={load} className="mt-4">
            <RefreshCw size={16} className="mr-2" /> {t.evm.retry}
          </Button>
        </div>
      </div>
    )
  }

  // ── Empty state ──
  if (!hasContract || !evm) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.evm.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.evm.subtitle}</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <DollarSign size={28} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{t.evm.noContractTitle}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            {t.evm.noContractDesc}
          </p>
        </div>
      </div>
    )
  }

  // ── Computed values ──
  const health = getHealthStatus(evm.spi, evm.cpi, {
    onTrack: t.evm.statusOnTrack,
    critical: t.evm.statusCritical,
    overBudget: t.evm.statusOverBudget,
    behindSchedule: t.evm.statusBehindSchedule,
    atRisk: t.evm.statusAtRisk,
  })
  const HealthIcon = health.icon

  const kpis: { label: string; value: string; icon: typeof DollarSign; good?: boolean | null }[] = [
    { label: t.evm.kpiBac, value: fmt(evm.bac, evm.currency), icon: Target, good: null },
    { label: t.evm.kpiEv, value: fmt(evm.ev, evm.currency), icon: TrendingUp, good: null },
    { label: t.evm.kpiPv, value: fmt(evm.pv, evm.currency), icon: Activity, good: null },
    { label: t.evm.kpiAc, value: fmt(evm.ac, evm.currency), icon: DollarSign, good: null },
    { label: t.evm.kpiSpi, value: fmtIdx(evm.spi), icon: Clock, good: evm.spi >= 1 },
    { label: t.evm.kpiCpi, value: fmtIdx(evm.cpi), icon: Calculator, good: evm.cpi >= 1 },
    { label: t.evm.kpiEac, value: fmt(evm.eac_cpi, evm.currency), icon: BarChart3, good: evm.eac_cpi <= evm.bac },
    { label: t.evm.kpiEtc, value: fmt(evm.etc, evm.currency), icon: TrendingDown, good: null },
    { label: t.evm.kpiVac, value: fmt(evm.vac, evm.currency), icon: AlertTriangle, good: evm.vac >= 0 },
  ]

  const variances = [
    { label: t.evm.varianceSV, value: evm.sv, good: evm.sv >= 0 },
    { label: t.evm.varianceCV, value: evm.cv, good: evm.cv >= 0 },
    { label: t.evm.varianceVAC, value: evm.vac, good: evm.vac >= 0 },
    { label: t.evm.varianceTCPI, value: evm.tcpi, isTcpi: true },
  ]

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.evm.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.evm.subtitle}</p>
          </div>
        </div>
        <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold', health.color)}>
          <HealthIcon size={16} />
          {health.label}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
        {kpis.map((kpi) => {
          const KIcon = kpi.icon
          const colorClass = kpi.good === null
            ? 'from-blue-500 to-blue-600'
            : kpi.good ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="relative overflow-hidden">
                <CardContent className="p-3">
                  <div className={cn('w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2', colorClass)}>
                    <KIcon size={14} className="text-white" />
                  </div>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">{kpi.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* S-Curve */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{t.evm.sCurveAnalysis}</h3>
            <SCurveChart evm={evm} legend={{ pv: t.evm.legendPv, ev: t.evm.legendEv, ac: t.evm.legendAc }} />
          </CardContent>
        </Card>

        {/* Performance Indices */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{t.evm.performanceIndices}</h3>
            <div className="flex justify-center">
              <IndicesChart spi={evm.spi} cpi={evm.cpi} />
            </div>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t.evm.schedulePerformance}</span>
                <span className={cn('font-semibold', evm.spi >= 1 ? 'text-green-600' : 'text-red-600')}>{fmtIdx(evm.spi)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t.evm.costPerformance}</span>
                <span className={cn('font-semibold', evm.cpi >= 1 ? 'text-green-600' : 'text-red-600')}>{fmtIdx(evm.cpi)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Variance Analysis + Forecasts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Variance Analysis */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{t.evm.varianceAnalysis}</h3>
            <div className="space-y-3">
              {variances.map((v) => (
                <div key={v.label} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <span className="text-xs text-slate-600 dark:text-slate-400 flex-1">{v.label}</span>
                  <span className={cn('text-sm font-bold tabular-nums',
                    'isTcpi' in v && v.isTcpi
                      ? 'text-slate-900 dark:text-white'
                      : v.good ? 'text-green-600' : 'text-red-600'
                  )}>
                    {'isTcpi' in v && v.isTcpi ? fmtIdx(v.value) : fmt(v.value, evm.currency)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Forecasts */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{t.evm.forecastAnalysis}</h3>
            <div className="space-y-3">
              {[
                { label: t.evm.eacCpiLabel, value: fmt(evm.eac_cpi, evm.currency), desc: t.evm.eacCpiDesc },
                { label: t.evm.eacLinearLabel, value: fmt(evm.eac_linear, evm.currency), desc: t.evm.eacLinearDesc },
                { label: t.evm.eacCombinedLabel, value: fmt(evm.eac_combined, evm.currency), desc: t.evm.eacCombinedDesc },
              ].map((f) => (
                <div key={f.label} className="py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{f.label}</span>
                    <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{f.value}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{f.desc}</p>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">ETC (Estimate to Complete)</span>
                  <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{fmt(evm.etc, evm.currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">VAC (Variance at Completion)</span>
                  <span className={cn('text-sm font-bold tabular-nums', evm.vac >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {fmt(evm.vac, evm.currency)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
