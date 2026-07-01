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
): { label: string; color: string; bg: string; icon: typeof CheckCircle2 } {
  if (spi >= 1 && cpi >= 1) return { label: labels.onTrack, color: 'text-[var(--color-success-light)]', bg: 'bg-[var(--color-success-bg)] border-[var(--color-success)]/20', icon: CheckCircle2 }
  if (spi < 0.9 && cpi < 0.9) return { label: labels.critical, color: 'text-[var(--color-danger)]', bg: 'bg-[var(--color-danger-bg)] border-[var(--color-danger)]/20', icon: XCircle }
  if (cpi < 1) return { label: labels.overBudget, color: 'text-[var(--color-danger)]', bg: 'bg-[var(--color-danger-bg)] border-[var(--color-danger)]/20', icon: AlertTriangle }
  if (spi < 1) return { label: labels.behindSchedule, color: 'text-[var(--color-amber)]', bg: 'bg-[var(--color-amber)]/10 border-[var(--color-amber)]/20', icon: Clock }
  return { label: labels.atRisk, color: 'text-[var(--color-amber)]', bg: 'bg-[var(--color-amber)]/10 border-[var(--color-amber)]/20', icon: AlertTriangle }
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

// ── SVG S-Curve Chart — Amber + Blue Stitch palette ──────────────────────

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

  const step = Math.max(1, Math.floor(n / 6))

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[700px] min-w-[500px]">
        {/* Subtle amber grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={PAD.left} x2={W - PAD.right} y1={y(maxY * f)} y2={y(maxY * f)}
            stroke="rgba(234,179,8,0.1)" strokeDasharray="4,4" />
        ))}
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text key={f} x={PAD.left - 8} y={y(maxY * f) + 4} textAnchor="end"
            fill="#9b8f79" fontSize={10}>
            {fmt(maxY * f, evm.currency)}
          </text>
        ))}
        {/* X-axis labels */}
        {evm.months.map((m, i) => i % step === 0 ? (
          <text key={m} x={x(i)} y={H - 10} textAnchor="middle"
            fill="#9b8f79" fontSize={9}>
            {m}
          </text>
        ) : null)}
        {/* S-Curves — Amber (PV), Blue (EV), Red-accent (AC) */}
        <polyline points={polyline(evm.pvCurve)} fill="none" stroke="#eab308" strokeWidth={2.5} strokeLinecap="round" />
        <polyline points={polyline(evm.evCurve)} fill="none" stroke="var(--color-info-light)" strokeWidth={2.5} strokeLinecap="round" />
        <polyline points={polyline(evm.acCurve)} fill="none" stroke="var(--color-danger-light)" strokeWidth={2} strokeDasharray="6,3" strokeLinecap="round" />
      </svg>
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs font-semibold">
        <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
          <span className="w-4 h-0.5 bg-[var(--color-amber)] inline-block rounded" /> {legend.pv}
        </span>
        <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
          <span className="w-4 h-0.5 bg-[var(--color-blue)] inline-block rounded" /> {legend.ev}
        </span>
        <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
          <span className="w-4 h-0.5 bg-[var(--color-danger-light)] inline-block rounded" /> {legend.ac}
        </span>
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
        stroke="#eab308" strokeWidth={1.5} strokeDasharray="6,3" />
      <text x={PAD.left - 6} y={yPos(1) + 4} textAnchor="end" fontSize={10} fill="#9b8f79">1.0</text>

      {bars.map((b) => {
        const barH = (b.value / maxVal) * ch
        const color = b.value >= 1 ? 'var(--color-success-light)' : 'var(--color-danger-light)'
        return (
          <g key={b.label}>
            <rect x={b.x} y={yPos(b.value)} width={barW} height={barH} rx={4} fill={color} opacity={0.85} />
            <text x={b.x + barW / 2} y={yPos(b.value) - 6} textAnchor="middle" fontSize={12} fill="#e5e1e4" fontWeight="700">
              {fmtIdx(b.value)}
            </text>
            <text x={b.x + barW / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="#9b8f79" fontWeight="600">
              {b.label}
            </text>
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
      <div className="p-4 md:p-8 space-y-6 min-h-screen bg-[var(--background)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-amber)] flex items-center justify-center">
            <TrendingUp size={20} className="text-[var(--color-on-amber)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text)]">{t.evm.title}</h2>
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)]">{t.evm.loadingAnalysis}</p>
          </div>
        </div>
        <TableSkeleton rows={6} columns={4} />
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div className="p-4 md:p-8 min-h-screen bg-[var(--background)]">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/20 flex items-center justify-center mb-4">
            <AlertTriangle size={28} className="text-[var(--color-danger)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--color-text)] mb-2">{error}</h3>
          <Button onClick={load} className="mt-4">
            <RefreshCw size={14} className="me-2" /> {t.evm.retry}
          </Button>
        </div>
      </div>
    )
  }

  // ── Empty state ──
  if (!hasContract || !evm) {
    return (
      <div className="p-4 md:p-8 min-h-screen bg-[var(--background)]">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-amber)] flex items-center justify-center">
            <TrendingUp size={20} className="text-[var(--color-on-amber)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text)]">{t.evm.title}</h2>
            <p className="text-sm text-[var(--color-text-muted)]">{t.evm.subtitle}</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-center mb-4">
            <DollarSign size={28} className="text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--color-text)] mb-2">{t.evm.noContractTitle}</h3>
          <p className="text-sm text-[var(--color-text-muted)] max-w-sm">{t.evm.noContractDesc}</p>
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
    <div className="p-4 md:p-8 space-y-6 min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-amber)] flex items-center justify-center">
            <TrendingUp size={20} className="text-[var(--color-on-amber)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text)]">{t.evm.title}</h2>
            <p className="text-sm text-[var(--color-text-muted)]">{t.evm.subtitle}</p>
          </div>
        </div>
        {/* Health badge */}
        <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold border', health.bg, health.color)}>
          <HealthIcon size={15} />
          {health.label}
        </div>
      </div>

      {/* KPI Strip — amber-accented horizontal row */}
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
        {kpis.map((kpi) => {
          const KIcon = kpi.icon
          const isAmber = kpi.good === null
          const iconBg = isAmber
            ? 'bg-[var(--color-amber)] text-[var(--color-on-amber)]'
            : kpi.good ? 'bg-[var(--color-success-bg)] text-[var(--color-success-light)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="p-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] hover:border-[var(--color-amber)]/30 transition-colors">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center mb-2', iconBg)}>
                  <KIcon size={13} />
                </div>
                <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">{kpi.label}</p>
                <p className="text-xs font-bold text-[var(--color-text)] truncate mt-0.5">{kpi.value}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* S-Curve — in an obsidian surface card */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
          <h3 className="text-sm font-bold text-[var(--color-text)] mb-1">{t.evm.sCurveAnalysis}</h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-4 font-mono uppercase tracking-wider">Planned · Earned · Actual</p>
          <SCurveChart evm={evm} legend={{ pv: t.evm.legendPv, ev: t.evm.legendEv, ac: t.evm.legendAc }} />
        </div>

        {/* Performance Indices */}
        <div className="p-5 rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
          <h3 className="text-sm font-bold text-[var(--color-text)] mb-4">{t.evm.performanceIndices}</h3>
          <div className="flex justify-center">
            <IndicesChart spi={evm.spi} cpi={evm.cpi} />
          </div>
          <div className="mt-4 space-y-2.5 border-t border-[var(--color-border)] pt-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--color-text-muted)]">{t.evm.schedulePerformance}</span>
              <span className={cn('text-sm font-bold tabular-nums', evm.spi >= 1 ? 'text-[var(--color-success-light)]' : 'text-[var(--color-danger)]')}>{fmtIdx(evm.spi)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[var(--color-text-muted)]">{t.evm.costPerformance}</span>
              <span className={cn('text-sm font-bold tabular-nums', evm.cpi >= 1 ? 'text-[var(--color-success-light)]' : 'text-[var(--color-danger)]')}>{fmtIdx(evm.cpi)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Variance Analysis + Forecasts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Variance Analysis */}
        <div className="p-5 rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
          <h3 className="text-sm font-bold text-[var(--color-text)] mb-4">{t.evm.varianceAnalysis}</h3>
          <div className="space-y-1">
            {variances.map((v) => (
              <div key={v.label} className="flex items-center justify-between py-2.5 border-b border-[var(--color-border)] last:border-0">
                <span className="text-xs text-[var(--color-text-muted)] flex-1">{v.label}</span>
                <span className={cn('text-sm font-bold tabular-nums',
                  'isTcpi' in v && v.isTcpi
                    ? 'text-[var(--color-text)]'
                    : v.good ? 'text-[var(--color-success-light)]' : 'text-[var(--color-danger)]'
                )}>
                  {'isTcpi' in v && v.isTcpi ? fmtIdx(v.value) : fmt(v.value, evm.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Forecasts */}
        <div className="p-5 rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
          <h3 className="text-sm font-bold text-[var(--color-text)] mb-4">{t.evm.forecastAnalysis}</h3>
          <div className="space-y-1">
            {[
              { label: t.evm.eacCpiLabel, value: fmt(evm.eac_cpi, evm.currency), desc: t.evm.eacCpiDesc },
              { label: t.evm.eacLinearLabel, value: fmt(evm.eac_linear, evm.currency), desc: t.evm.eacLinearDesc },
              { label: t.evm.eacCombinedLabel, value: fmt(evm.eac_combined, evm.currency), desc: t.evm.eacCombinedDesc },
            ].map((f) => (
              <div key={f.label} className="py-2.5 border-b border-[var(--color-border)] last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{f.label}</span>
                  <span className="text-sm font-bold tabular-nums text-[var(--color-text)]">{f.value}</span>
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{f.desc}</p>
              </div>
            ))}
            <div className="pt-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{t.evm.etcLabel}</span>
                <span className="text-sm font-bold tabular-nums text-[var(--color-text)]">{fmt(evm.etc, evm.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{t.evm.vacLabel}</span>
                <span className={cn('text-sm font-bold tabular-nums', evm.vac >= 0 ? 'text-[var(--color-success-light)]' : 'text-[var(--color-danger)]')}>
                  {fmt(evm.vac, evm.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
