'use client'

import { Fragment, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '../workspace-context'
import { FileSpreadsheet, Link2 } from 'lucide-react'
import type { BOQItem } from '@/lib/types'

export function BoqMode() {
  const { data, selection, selectBoqItem, fmt } = useWorkspace()

  const sections = useMemo(() => {
    const map = new Map<string, BOQItem[]>()
    for (const item of data.boqItems) {
      const key = item.section || 'Unsectioned'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return Array.from(map.entries())
  }, [data.boqItems])

  const grandTotal = data.boqItems.reduce((s, i) => s + (i.total_amount ?? 0), 0)

  if (data.boqItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <FileSpreadsheet size={28} className="text-[var(--color-text-muted)]" />
        <p className="text-sm font-medium text-[var(--color-text)]">Bill of quantities is empty</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-[12.5px] border-collapse">
        <thead className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-[var(--color-border-strong)]">
          <tr>
            <th className="text-start px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold w-20">Item</th>
            <th className="text-start px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Description</th>
            <th className="text-start px-2 py-2 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Unit</th>
            <th className="text-end px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Qty</th>
            <th className="text-end px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Rate</th>
            <th className="text-end px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sections.map(([section, items]) => {
            const sectionTotal = items.reduce((s, i) => s + (i.total_amount ?? 0), 0)
            return (
              <Fragment key={section}>
                <tr className="bg-[var(--color-surface-sunken)]">
                  <td colSpan={6} className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{section}</td>
                </tr>
                {items.map(item => {
                  const selected = selection.boqItem?.id === item.id
                  return (
                    <tr
                      key={item.id}
                      onClick={() => selectBoqItem(selected ? null : item)}
                      className={cn(
                        'cursor-pointer border-b border-[var(--color-border-light)] transition-colors',
                        selected ? 'bg-[var(--color-brand-tint)]' : 'hover:bg-[var(--color-surface-hover)]'
                      )}
                    >
                      <td className="px-3 py-2 mono text-[11px] text-[var(--color-text-muted)]">{item.code ?? '—'}</td>
                      <td className="px-3 py-2 font-medium text-[var(--color-text)]">
                        <span className="inline-flex items-center gap-1.5">
                          {item.mi_id && <Link2 size={11} className="text-[var(--color-brand)]" />}
                          {item.description}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-[var(--color-text-secondary)]">{item.unit}</td>
                      <td className="px-3 py-2 text-end mono text-[var(--color-text)]">{fmt(item.quantity)}</td>
                      <td className="px-3 py-2 text-end mono text-[var(--color-text-secondary)]">{item.unit_rate != null ? fmt(item.unit_rate) : '—'}</td>
                      <td className="px-3 py-2 text-end mono font-semibold text-[var(--color-text)]">{item.total_amount != null ? fmt(item.total_amount) : '—'}</td>
                    </tr>
                  )
                })}
                <tr className="border-b-2 border-[var(--color-border-strong)]">
                  <td colSpan={5} className="px-3 py-1.5 text-end text-[11px] font-semibold text-[var(--color-text-secondary)]">Section total</td>
                  <td className="px-3 py-1.5 text-end mono font-semibold text-[var(--color-text)]">{fmt(sectionTotal)}</td>
                </tr>
              </Fragment>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="sticky bottom-0 bg-[var(--color-surface-elevated)] border-t-2 border-[var(--color-brand)]">
            <td colSpan={5} className="px-3 py-2.5 text-end text-[12px] font-bold text-[var(--color-text)]">Grand total</td>
            <td className="px-3 py-2.5 text-end mono font-bold text-[var(--color-brand)]">{fmt(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
