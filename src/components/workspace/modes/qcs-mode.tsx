'use client'

import { Fragment, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '../workspace-context'
import { EmptyState } from '@/components/ui/empty-state'
import { SelectionBracket, VerifiedMark } from '@/components/icons/marks'
import { ClipboardList, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import type { BOQItem, MeasurementItem } from '@/lib/types'

interface Abstract {
  boqItem: BOQItem
  sources: MeasurementItem[]
  computedQty: number
  variance: number
}

export function QcsMode() {
  const { data, selection, selectBoqItem, fmt } = useWorkspace()
  const [open, setOpen] = useState<Set<string>>(new Set())

  const abstracts: Abstract[] = useMemo(() => {
    return data.boqItems.map(b => {
      const sources = data.measurementItems.filter(m =>
        (b.mi_id && m.id === b.mi_id) || (b.code && m.item_code === b.code)
      )
      const computedQty = sources.reduce((s, m) => s + m.net_qty, 0)
      return { boqItem: b, sources, computedQty, variance: computedQty - b.quantity }
    })
  }, [data.boqItems, data.measurementItems])

  const toggle = (id: string) => setOpen(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  if (abstracts.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No abstracts yet"
        description="Once BOQ items exist, this sheet groups every measurement-book line that feeds each one and checks the roll-up against the billed quantity."
      />
    )
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-[13px] border-collapse">
        <thead className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-[var(--color-border-strong)]">
          <tr>
            <th className="w-6" />
            <th className="w-8" />
            <th className="text-start px-2 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Item</th>
            <th className="text-start px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Description</th>
            <th className="text-start px-2 py-2 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Unit</th>
            <th className="text-end px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Computed</th>
            <th className="text-end px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Billed</th>
            <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Check</th>
          </tr>
        </thead>
        <tbody>
          {abstracts.map(a => {
            const isOpen = open.has(a.boqItem.id)
            const isSelected = selection.boqItem?.id === a.boqItem.id
            const ok = Math.abs(a.variance) < 0.01
            return (
              <Fragment key={a.boqItem.id}>
                <tr
                  onClick={() => selectBoqItem(isSelected ? null : a.boqItem)}
                  className={cn(
                    'cursor-pointer border-b border-[var(--color-border-light)] transition-colors',
                    isSelected ? 'bg-[var(--color-brand-tint)]' : 'hover:bg-[var(--color-surface-hover)]'
                  )}
                >
                  <td className="ps-2.5">
                    <SelectionBracket active={isSelected} className="text-[var(--color-brand)]" />
                  </td>
                  <td className="px-2 py-2">
                    {a.sources.length > 0 && (
                      <button onClick={e => { e.stopPropagation(); toggle(a.boqItem.id) }} className="text-[var(--color-text-muted)]">
                        {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-2 mono text-[11px] text-[var(--color-text-muted)]">{a.boqItem.code ?? '—'}</td>
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]">{a.boqItem.description}</td>
                  <td className="px-2 py-2 text-[var(--color-text-secondary)]">{a.boqItem.unit}</td>
                  <td className="px-3 py-2 text-end mono text-[var(--color-text)]">{fmt(a.computedQty)}</td>
                  <td className="px-3 py-2 text-end mono text-[var(--color-text)]">{fmt(a.boqItem.quantity)}</td>
                  <td className="px-3 py-2 text-center">
                    {a.sources.length === 0 ? (
                      <span className="text-[10px] text-[var(--color-text-muted)]">no source</span>
                    ) : ok ? (
                      <VerifiedMark size={15} className="inline text-[var(--color-success)]" />
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-warning)]">
                        <AlertTriangle size={13} />{a.variance > 0 ? '+' : ''}{fmt(a.variance)}
                      </span>
                    )}
                  </td>
                </tr>
                {isOpen && a.sources.map(m => (
                  <tr key={m.id} className="border-b border-[var(--color-border-light)] bg-[var(--color-surface-sunken)]">
                    <td colSpan={2} />
                    <td className="px-2 py-1.5 mono text-[10px] text-[var(--color-text-muted)]">{m.item_code ?? '—'}</td>
                    <td className="px-3 py-1.5 text-[12px] text-[var(--color-text-secondary)]" colSpan={2}>
                      {m.description} <span className="text-[var(--color-text-muted)]">— {m.section ?? 'Unsectioned'}</span>
                    </td>
                    <td className="px-3 py-1.5 text-end mono text-[12px] text-[var(--color-text-secondary)]">{fmt(m.net_qty)}</td>
                    <td colSpan={2} />
                  </tr>
                ))}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
