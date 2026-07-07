'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '../workspace-context'
import { Calculator, Wrench } from 'lucide-react'
import type { RateAnalysis, ResourceType } from '@/lib/types'

const RESOURCE_META: Record<ResourceType, { label: string; color: string }> = {
  material: { label: 'Material', color: 'var(--color-tag-1)' },
  labor: { label: 'Labour', color: 'var(--color-tag-3)' },
  equipment: { label: 'Equipment', color: 'var(--color-tag-2)' },
  subcontractor: { label: 'Subcontractor', color: 'var(--color-tag-5)' },
}

export function PricingMode() {
  const { data, selection, linkedRateAnalysis, fmt } = useWorkspace()
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (linkedRateAnalysis) setActiveId(linkedRateAnalysis.id)
  }, [linkedRateAnalysis])

  const active = useMemo(
    () => data.rateAnalyses.find(r => r.id === activeId) ?? linkedRateAnalysis ?? data.rateAnalyses[0] ?? null,
    [activeId, linkedRateAnalysis, data.rateAnalyses]
  )

  if (data.rateAnalyses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <Calculator size={28} className="text-[var(--color-text-muted)]" />
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">No rate build-ups yet</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm">Pricing is measured separately from quantity — build a rate analysis per BOQ item from material, labour, equipment and subcontractor components.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid h-full" style={{ gridTemplateColumns: 'minmax(200px,260px) 1fr' }}>
      <div className="overflow-y-auto border-e border-[var(--color-border)]">
        {data.rateAnalyses.map(r => (
          <button
            key={r.id}
            onClick={() => setActiveId(r.id)}
            className={cn(
              'w-full text-start px-3 py-2.5 border-b border-[var(--color-border-light)] transition-colors',
              active?.id === r.id ? 'bg-[var(--color-brand-tint)]' : 'hover:bg-[var(--color-surface-hover)]'
            )}
          >
            <div className="text-[12.5px] font-medium text-[var(--color-text)] truncate">{r.description}</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-[var(--color-text-muted)]">per {r.unit}</span>
              <span className="mono text-[12px] font-semibold text-[var(--color-text)]">{fmt(r.unit_rate)}</span>
            </div>
          </button>
        ))}
      </div>
      {active && <RateBuildUp rate={active} fmt={fmt} />}
    </div>
  )
}

function RateBuildUp({ rate, fmt }: { rate: RateAnalysis; fmt: (n: number) => string }) {
  const totals = {
    material: rate.material_total,
    labor: rate.labor_total,
    equipment: rate.equipment_total,
    subcontractor: rate.subcon_total,
  }
  const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1

  return (
    <div className="overflow-y-auto p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--color-text)]">{rate.description}</h3>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Output {rate.output_qty} {rate.unit} · O/H {rate.overhead_pct}% · Profit {rate.profit_pct}%</p>
        </div>
        <div className="text-end shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Rate / {rate.unit}</div>
          <div className="mono text-xl font-bold text-[var(--color-brand)]">{fmt(rate.unit_rate)}</div>
        </div>
      </div>

      <div className="flex h-6 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--color-border)]">
        {(Object.keys(totals) as ResourceType[]).map(k => totals[k] > 0 && (
          <div key={k} style={{ width: `${(totals[k] / sum) * 100}%`, background: RESOURCE_META[k].color }} title={RESOURCE_META[k].label} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-2.5 mb-6">
        {(Object.keys(totals) as ResourceType[]).map(k => (
          <span key={k} className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--color-text-secondary)]">
            <i className="w-2 h-2 rounded-[2px] inline-block" style={{ background: RESOURCE_META[k].color }} />
            {RESOURCE_META[k].label} <span className="mono">{fmt(totals[k])}</span>
          </span>
        ))}
      </div>

      <table className="w-full text-[12.5px] border-collapse">
        <thead>
          <tr className="border-b border-[var(--color-border-strong)]">
            <th className="text-start px-2 py-1.5 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Resource</th>
            <th className="text-start px-2 py-1.5 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Type</th>
            <th className="text-end px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Qty</th>
            <th className="text-end px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Unit cost</th>
            <th className="text-end px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {(rate.resources ?? []).map(res => (
            <tr key={res.id} className="border-b border-[var(--color-border-light)]">
              <td className="px-2 py-1.5 text-[var(--color-text)]">{res.description}</td>
              <td className="px-2 py-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded-[var(--radius-xs)]" style={{ background: `${RESOURCE_META[res.resource_type].color}22`, color: RESOURCE_META[res.resource_type].color }}>
                  {RESOURCE_META[res.resource_type].label}
                </span>
              </td>
              <td className="px-2 py-1.5 text-end mono text-[var(--color-text-secondary)]">{res.quantity} {res.unit}</td>
              <td className="px-2 py-1.5 text-end mono text-[var(--color-text-secondary)]">{fmt(res.unit_cost)}</td>
              <td className="px-2 py-1.5 text-end mono font-medium text-[var(--color-text)]">{fmt(res.total_amount)}</td>
            </tr>
          ))}
          {(!rate.resources || rate.resources.length === 0) && (
            <tr><td colSpan={5} className="px-2 py-4 text-center text-[var(--color-text-muted)] italic flex items-center justify-center gap-2">
              <Wrench size={13} /> No resources itemised
            </td></tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t border-[var(--color-border)]">
            <td colSpan={4} className="px-2 py-1.5 text-end text-[var(--color-text-secondary)]">Direct cost</td>
            <td className="px-2 py-1.5 text-end mono font-medium text-[var(--color-text)]">{fmt(rate.direct_cost)}</td>
          </tr>
          <tr>
            <td colSpan={4} className="px-2 py-1.5 text-end text-[var(--color-text-secondary)]">Overhead ({rate.overhead_pct}%)</td>
            <td className="px-2 py-1.5 text-end mono text-[var(--color-text)]">{fmt(rate.overhead_amount)}</td>
          </tr>
          <tr>
            <td colSpan={4} className="px-2 py-1.5 text-end text-[var(--color-text-secondary)]">Profit ({rate.profit_pct}%)</td>
            <td className="px-2 py-1.5 text-end mono text-[var(--color-text)]">{fmt(rate.profit_amount)}</td>
          </tr>
          <tr className="border-t-2 border-[var(--color-brand)]">
            <td colSpan={4} className="px-2 py-2 text-end font-semibold text-[var(--color-text)]">Rate per {rate.unit}</td>
            <td className="px-2 py-2 text-end mono font-bold text-[var(--color-brand)]">{fmt(rate.unit_rate)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
