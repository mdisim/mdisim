'use client'

import { cn } from '@/lib/utils'
import { useWorkspace } from '../workspace-context'
import { EmptyState } from '@/components/ui/empty-state'
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, Activity, AlertTriangle,
  CheckCircle2, Clock, XCircle, Target, Calculator,
} from 'lucide-react'
import type { Contract, CostEntry, PaymentCert } from '@/lib/types'

function fmtCur(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}
const fmtIdx = (value: number) => value.toFixed(2)

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

function getHealthStatus(spi: number, cpi: number) {
  if (spi >= 1 && cpi >= 1) return { label: 'On track', color: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success-tint)] border-[var(--color-success)]/20', icon: CheckCircle2 }
  if (spi < 0.9 && cpi < 0.9) return { label: 'Critical', color: 'text-[var(--color-danger)]', bg: 'bg-[var(--color-danger-tint)] border-[var(--color-danger)]/20', icon: XCircle }
  if (cpi < 1) return { label: 'Over budget', color: 'text-[var(--color-danger)]', bg: 'bg-[var(--color-danger-tint)] border-[var(--color-danger)]/20', icon: AlertTriangle }
  if (spi < 1) return { label: 'Behind schedule', color: 'text-[var(--color-warning)]', bg: 'bg-[var(--color-warning-tint)] border-[var(--color-warning)]/20', icon: Clock }
  return { label: 'At risk', color: 'text-[var(--color-warning)]', bg: 'bg-[var(--color-warning-tint)] border-[var(--color-warning)]/20', icon: AlertTriangle }
}

interface EVMData {
  bac: number; ev: number; pv: number; ac: number; spi: number; cpi: number; sv: number; cv: number
  eac_cpi: number; eac_linear: number; eac_combined: number; etc: number; vac: number; tcpi: number
  months: string[]; pvCurve: number[]; evCurve: number[]; acCurve: number[]; currency: string
}

function computeEVM(contract: Contract, costEntries: CostEntry[], paymentCerts: PaymentCert[], currency: string): EVMData {
  const bac = contract.contract_value
  const startDate = contract.start_date ?? new Date().toISOString().slice(0, 10)
  const endDate = contract.end_date ?? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
  const months = monthsBetween(startDate, endDate)
  const totalMonths = months.length || 1

  const pvCurve = months.map((_, i) => (bac / totalMonths) * (i + 1))

  const certsByMonth = new Map<string, number>()
  paymentCerts.forEach((pc) => {
    const m = pc.period_to.slice(0, 7)
    certsByMonth.set(m, (certsByMonth.get(m) ?? 0) + pc.current_gross)
  })
  let cumEv = 0
  const evCurve = months.map((m) => { cumEv += certsByMonth.get(m) ?? 0; return cumEv })

  const costsByMonth = new Map<string, number>()
  costEntries.forEach((ce) => {
    const m = ce.period_date.slice(0, 7)
    costsByMonth.set(m, (costsByMonth.get(m) ?? 0) + ce.amount)
  })
  let cumAc = 0
  const acCurve = months.map((m) => { cumAc += costsByMonth.get(m) ?? 0; return cumAc })

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

function SCurveChart({ evm }: { evm: EVMData }) {
  const W = 700, H = 300, PAD = { top: 20, right: 30, bottom: 50, left: 70 }
  const cw = W - PAD.left - PAD.right
  const ch = H - PAD.top - PAD.bottom
  const allValues = [...evm.pvCurve, ...evm.evCurve, ...evm.acCurve]
  const maxY = Math.max(...allValues, 1)
  const n = evm.months.length
  const x = (i: number) => PAD.left + (i / Math.max(n - 1, 1)) * cw
  const y = (v: number) => PAD.top + ch - (v / maxY) * ch
  const polyline = (data: number[]) => data.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const step = Math.max(1, Math.floor(n / 6))

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[700px] min-w-[500px]">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={PAD.left} x2={W - PAD.right} y1={y(maxY * f)} y2={y(maxY * f)} stroke="var(--color-border)" strokeDasharray="4,4" />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text key={f} x={PAD.left - 8} y={y(maxY * f) + 4} textAnchor="end" fill="var(--color-text-muted)" fontSize={10}>{fmtCur(maxY * f, evm.currency)}</text>
        ))}
        {evm.months.map((m, i) => i % step === 0 ? (
          <text key={m} x={x(i)} y={H - 10} textAnchor="middle" fill="var(--color-text-muted)" fontSize={9}>{m}</text>
        ) : null)}
        <polyline points={polyline(evm.pvCurve)} fill="none" stroke="var(--color-warning)" strokeWidth={2.5} strokeLinecap="round" />
        <polyline points={polyline(evm.evCurve)} fill="none" stroke="var(--color-brand)" strokeWidth={2.5} strokeLinecap="round" />
        <polyline points={polyline(evm.acCurve)} fill="none" stroke="var(--color-danger)" strokeWidth={2} strokeDasharray="6,3" strokeLinecap="round" />
      </svg>
      <div className="flex items-center justify-center gap-6 mt-3 text-xs font-semibold">
        <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]"><span className="w-4 h-0.5 bg-[var(--color-warning)] inline-block rounded" /> Planned value</span>
        <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]"><span className="w-4 h-0.5 bg-[var(--color-brand)] inline-block rounded" /> Earned value</span>
        <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]"><span className="w-4 h-0.5 bg-[var(--color-danger)] inline-block rounded" /> Actual cost</span>
      </div>
    </div>
  )
}

function IndicesChart({ spi, cpi }: { spi: number; cpi: number }) {
  const W = 300, H = 200, PAD = { top: 20, right: 20, bottom: 30, left: 40 }
  const ch = H - PAD.top - PAD.bottom
  const barW = 50
  const maxVal = Math.max(spi, cpi, 1.5)
  const yPos = (v: number) => PAD.top + ch - (v / maxVal) * ch
  const bars = [{ label: 'SPI', value: spi, x: PAD.left + 40 }, { label: 'CPI', value: cpi, x: PAD.left + 140 }]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[300px]">
      <line x1={PAD.left} x2={W - PAD.right} y1={yPos(1)} y2={yPos(1)} stroke="var(--color-warning)" strokeWidth={1.5} strokeDasharray="6,3" />
      <text x={PAD.left - 6} y={yPos(1) + 4} textAnchor="end" fontSize={10} fill="var(--color-text-muted)">1.0</text>
      {bars.map((b) => {
        const barH = (b.value / maxVal) * ch
        const color = b.value >= 1 ? 'var(--color-success)' : 'var(--color-danger)'
        return (
          <g key={b.label}>
            <rect x={b.x} y={yPos(b.value)} width={barW} height={barH} rx={4} fill={color} opacity={0.85} />
            <text x={b.x + barW / 2} y={yPos(b.value) - 6} textAnchor="middle" fontSize={12} fill="var(--color-text)" fontWeight="700">{fmtIdx(b.value)}</text>
            <text x={b.x + barW / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--color-text-muted)" fontWeight="600">{b.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function EvmMode({ currency }: { currency: string }) {
  const { data } = useWorkspace()
  const { contract, costEntries, payments } = data

  if (!contract) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No contract set up yet"
        description="Earned value management needs a contract value and dates — set one up from Cost Control first."
      />
    )
  }

  const evm = computeEVM(contract, costEntries, payments, currency)
  const health = getHealthStatus(evm.spi, evm.cpi)
  const HealthIcon = health.icon

  const kpis: { label: string; value: string; icon: typeof DollarSign; good?: boolean | null }[] = [
    { label: 'BAC', value: fmtCur(evm.bac, evm.currency), icon: Target, good: null },
    { label: 'EV', value: fmtCur(evm.ev, evm.currency), icon: TrendingUp, good: null },
    { label: 'PV', value: fmtCur(evm.pv, evm.currency), icon: Activity, good: null },
    { label: 'AC', value: fmtCur(evm.ac, evm.currency), icon: DollarSign, good: null },
    { label: 'SPI', value: fmtIdx(evm.spi), icon: Clock, good: evm.spi >= 1 },
    { label: 'CPI', value: fmtIdx(evm.cpi), icon: Calculator, good: evm.cpi >= 1 },
    { label: 'EAC', value: fmtCur(evm.eac_cpi, evm.currency), icon: BarChart3, good: evm.eac_cpi <= evm.bac },
    { label: 'ETC', value: fmtCur(evm.etc, evm.currency), icon: TrendingDown, good: null },
    { label: 'VAC', value: fmtCur(evm.vac, evm.currency), icon: AlertTriangle, good: evm.vac >= 0 },
  ]

  const variances = [
    { label: 'Schedule variance (SV)', value: evm.sv, good: evm.sv >= 0 },
    { label: 'Cost variance (CV)', value: evm.cv, good: evm.cv >= 0 },
    { label: 'Variance at completion (VAC)', value: evm.vac, good: evm.vac >= 0 },
    { label: 'To-complete performance index (TCPI)', value: evm.tcpi, isTcpi: true },
  ]

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-end">
        <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-bold border', health.bg, health.color)}>
          <HealthIcon size={15} /> {health.label}
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
        {kpis.map((kpi) => {
          const KIcon = kpi.icon
          const isNeutral = kpi.good === null
          const iconBg = isNeutral ? 'bg-[var(--color-brand)] text-white' : kpi.good ? 'bg-[var(--color-success-tint)] text-[var(--color-success)]' : 'bg-[var(--color-danger-tint)] text-[var(--color-danger)]'
          return (
            <div key={kpi.label} className="p-3 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)] hover:border-[var(--color-brand)]/30 transition-colors">
              <div className={cn('w-7 h-7 rounded-[var(--radius-md)] flex items-center justify-center mb-2', iconBg)}><KIcon size={13} /></div>
              <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">{kpi.label}</p>
              <p className="text-xs font-bold text-[var(--color-text)] truncate mt-0.5">{kpi.value}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 p-5 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
          <h3 className="text-[13px] font-bold text-[var(--color-text)] mb-1">S-curve analysis</h3>
          <p className="text-[11px] text-[var(--color-text-muted)] mb-4 font-mono uppercase tracking-wider">Planned · Earned · Actual</p>
          <SCurveChart evm={evm} />
        </div>
        <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
          <h3 className="text-[13px] font-bold text-[var(--color-text)] mb-4">Performance indices</h3>
          <div className="flex justify-center"><IndicesChart spi={evm.spi} cpi={evm.cpi} /></div>
          <div className="mt-4 space-y-2.5 border-t border-[var(--color-border)] pt-4">
            <div className="flex justify-between items-center"><span className="text-[12px] text-[var(--color-text-muted)]">Schedule performance</span><span className={cn('text-[13px] font-bold mono', evm.spi >= 1 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]')}>{fmtIdx(evm.spi)}</span></div>
            <div className="flex justify-between items-center"><span className="text-[12px] text-[var(--color-text-muted)]">Cost performance</span><span className={cn('text-[13px] font-bold mono', evm.cpi >= 1 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]')}>{fmtIdx(evm.cpi)}</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
          <h3 className="text-[13px] font-bold text-[var(--color-text)] mb-4">Variance analysis</h3>
          <div className="space-y-1">
            {variances.map((v) => (
              <div key={v.label} className="flex items-center justify-between py-2.5 border-b border-[var(--color-border-light)] last:border-0">
                <span className="text-[12px] text-[var(--color-text-muted)] flex-1">{v.label}</span>
                <span className={cn('text-[13px] font-bold mono', 'isTcpi' in v && v.isTcpi ? 'text-[var(--color-text)]' : v.good ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]')}>
                  {'isTcpi' in v && v.isTcpi ? fmtIdx(v.value) : fmtCur(v.value, evm.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-5 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
          <h3 className="text-[13px] font-bold text-[var(--color-text)] mb-4">Forecast analysis</h3>
          <div className="space-y-1">
            {[
              { label: 'EAC (CPI-based)', value: fmtCur(evm.eac_cpi, evm.currency), desc: 'Estimate at completion using cost performance to date' },
              { label: 'EAC (linear)', value: fmtCur(evm.eac_linear, evm.currency), desc: 'Actual cost plus remaining work at budgeted rate' },
              { label: 'EAC (combined)', value: fmtCur(evm.eac_combined, evm.currency), desc: 'Actual cost plus remaining work adjusted by CPI' },
            ].map((f) => (
              <div key={f.label} className="py-2.5 border-b border-[var(--color-border-light)] last:border-0">
                <div className="flex items-center justify-between"><span className="text-[12px] font-semibold text-[var(--color-text-secondary)]">{f.label}</span><span className="text-[13px] font-bold mono text-[var(--color-text)]">{f.value}</span></div>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{f.desc}</p>
              </div>
            ))}
            <div className="pt-2.5 space-y-2">
              <div className="flex items-center justify-between"><span className="text-[12px] font-semibold text-[var(--color-text-secondary)]">Estimate to complete</span><span className="text-[13px] font-bold mono text-[var(--color-text)]">{fmtCur(evm.etc, evm.currency)}</span></div>
              <div className="flex items-center justify-between"><span className="text-[12px] font-semibold text-[var(--color-text-secondary)]">Variance at completion</span><span className={cn('text-[13px] font-bold mono', evm.vac >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]')}>{fmtCur(evm.vac, evm.currency)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
