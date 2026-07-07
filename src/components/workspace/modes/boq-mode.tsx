'use client'

import { Fragment, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '../workspace-context'
import { useMultiSelect } from '@/lib/hooks/use-multi-select'
import { useContextMenu, ContextMenu } from '@/components/ui/context-menu'
import { useToast } from '@/components/ui/toast'
import { EmptyState } from '@/components/ui/empty-state'
import { SelectionBracket, TraceMark } from '@/components/icons/marks'
import { SelectionBar } from './selection-bar'
import { FileSpreadsheet, Copy } from 'lucide-react'
import type { BOQItem } from '@/lib/types'

export function BoqMode() {
  const { data, selection, selectBoqItem, fmt } = useWorkspace()
  const { toast } = useToast()
  const menu = useContextMenu()
  const [contextItem, setContextItem] = useState<BOQItem | null>(null)

  const sections = useMemo(() => {
    const map = new Map<string, BOQItem[]>()
    for (const item of data.boqItems) {
      const key = item.section || 'Unsectioned'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return Array.from(map.entries())
  }, [data.boqItems])

  const orderedIds = useMemo(() => sections.flatMap(([, items]) => items.map(i => i.id)), [sections])
  const multi = useMultiSelect(orderedIds)
  const grandTotal = data.boqItems.reduce((s, i) => s + (i.total_amount ?? 0), 0)

  const copyCode = (item: BOQItem) => {
    navigator.clipboard?.writeText(item.code ?? item.description)
    toast({ title: 'Copied', description: item.code ?? item.description, variant: 'success', duration: 2000 })
  }

  if (data.boqItems.length === 0) {
    return (
      <EmptyState
        icon={FileSpreadsheet}
        title="Bill of quantities is empty"
        description="Items roll up automatically once quantities are taken off, or add them directly from the rate library."
      />
    )
  }

  return (
    <div className="relative h-full overflow-auto">
      <table className="w-full text-[13px] border-collapse">
        <thead className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-[var(--color-border-strong)]">
          <tr>
            <th className="w-6" />
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
                  <td colSpan={7} className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{section}</td>
                </tr>
                {items.map(item => {
                  const active = selection.boqItem?.id === item.id
                  const inBulk = multi.isSelected(item.id)
                  return (
                    <tr
                      key={item.id}
                      onClick={e => {
                        if (e.metaKey || e.ctrlKey || e.shiftKey) { multi.click(item.id, e); return }
                        if (multi.count > 0) multi.clear()
                        multi.setAnchorOnly(item.id)
                        selectBoqItem(active ? null : item)
                      }}
                      onContextMenu={e => { setContextItem(item); menu.onContextMenu(e) }}
                      className={cn(
                        'cursor-pointer border-b border-[var(--color-border-light)] transition-colors',
                        active ? 'bg-[var(--color-brand-tint)]' : inBulk ? 'bg-[var(--color-info-tint)]' : 'hover:bg-[var(--color-surface-hover)]'
                      )}
                    >
                      <td className="ps-2.5">
                        <SelectionBracket active={active || inBulk} className={active ? 'text-[var(--color-brand)]' : 'text-[var(--color-info)]'} />
                      </td>
                      <td className="px-3 py-2 mono text-[11px] text-[var(--color-text-muted)]">{item.code ?? '—'}</td>
                      <td className="px-3 py-2 font-medium text-[var(--color-text)]">
                        <span className="inline-flex items-center gap-1.5">
                          {item.mi_id && <TraceMark className="text-[var(--color-brand)]" />}
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
                  <td colSpan={6} className="px-3 py-1.5 text-end text-[11px] font-semibold text-[var(--color-text-secondary)]">Section total</td>
                  <td className="px-3 py-1.5 text-end mono font-semibold text-[var(--color-text)]">{fmt(sectionTotal)}</td>
                </tr>
              </Fragment>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="sticky bottom-0 bg-[var(--color-surface-elevated)] border-t-2 border-[var(--color-brand)]">
            <td colSpan={6} className="px-3 py-2.5 text-end text-[12px] font-bold text-[var(--color-text)]">Grand total</td>
            <td className="px-3 py-2.5 text-end mono font-bold text-[var(--color-brand)]">{fmt(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>

      <SelectionBar count={multi.count} onClear={multi.clear}>
        <button
          onClick={() => {
            const items = data.boqItems.filter(b => multi.isSelected(b.id))
            const total = items.reduce((s, i) => s + (i.total_amount ?? 0), 0)
            navigator.clipboard?.writeText(items.map(i => `${i.code ?? ''}\t${i.description}\t${i.quantity}\t${i.unit_rate ?? ''}\t${i.total_amount ?? ''}`).join('\n'))
            toast({ title: `Copied ${items.length} rows`, description: `Combined amount ${fmt(total)}`, variant: 'success', duration: 2500 })
          }}
          className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          <Copy size={12} /> Copy rows
        </button>
      </SelectionBar>

      <ContextMenu
        position={menu.position}
        onClose={menu.close}
        items={contextItem ? [
          { label: 'Copy code', icon: <Copy size={13} />, onSelect: () => copyCode(contextItem) },
          { label: 'Copy description', icon: <Copy size={13} />, onSelect: () => { navigator.clipboard?.writeText(contextItem.description); toast({ title: 'Copied description', variant: 'success', duration: 2000 }) } },
        ] : []}
      />
    </div>
  )
}
