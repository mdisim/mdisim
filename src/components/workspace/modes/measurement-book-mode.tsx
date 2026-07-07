'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '../workspace-context'
import { EmptyState } from '@/components/ui/empty-state'
import { SelectionBracket, DeductMark } from '@/components/icons/marks'
import { Ruler, ChevronDown, ChevronRight } from 'lucide-react'
import type { MeasurementItem } from '@/lib/types'

function dim(n: number | null) {
  return n === null || n === undefined ? '—' : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function MeasurementBookMode() {
  const { data, selection, selectMeasurement, fmt } = useWorkspace()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const sections = useMemo(() => {
    const map = new Map<string, MeasurementItem[]>()
    for (const item of data.measurementItems) {
      const key = item.section || 'Unsectioned'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return Array.from(map.entries())
  }, [data.measurementItems])

  const toggle = (key: string) => setCollapsed(prev => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  if (data.measurementItems.length === 0) {
    return (
      <EmptyState
        icon={Ruler}
        title="Measurement book is empty"
        description="Take off a shape in Takeoff mode and it lands here as a working dimension sheet — Nr × L × B × H, deductions included."
      />
    )
  }

  return (
    <div className="h-full overflow-auto grid-paper">
      <table className="w-full text-[13px] border-collapse">
        <thead className="sticky top-0 z-10 bg-[var(--color-surface)]">
          <tr className="border-b border-[var(--color-border-strong)]">
            <th className="w-8" />
            <th className="text-start px-2 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Nr</th>
            <th className="text-end px-2 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">L</th>
            <th className="text-end px-2 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">B</th>
            <th className="text-end px-2 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold border-e-2 border-double border-[var(--color-border-strong)]">H</th>
            <th className="text-start px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Description</th>
            <th className="text-start px-2 py-2 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Unit</th>
            <th className="text-end px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Qty</th>
          </tr>
        </thead>
        <tbody>
          {sections.map(([section, items]) => (
            <SectionBlock
              key={section}
              section={section}
              items={items}
              isCollapsed={collapsed.has(section)}
              onToggle={() => toggle(section)}
              selectedId={selection.measurement?.id ?? null}
              onSelect={selectMeasurement}
              fmt={fmt}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SectionBlock({
  section, items, isCollapsed, onToggle, selectedId, onSelect, fmt,
}: {
  section: string
  items: MeasurementItem[]
  isCollapsed: boolean
  onToggle: () => void
  selectedId: string | null
  onSelect: (item: MeasurementItem | null) => void
  fmt: (n: number) => string
}) {
  const sectionTotal = items.reduce((s, i) => s + i.net_qty, 0)
  return (
    <>
      <tr className="bg-[var(--color-surface-sunken)] border-b border-t border-[var(--color-border)]">
        <td colSpan={7} className="px-2 py-1.5">
          <button onClick={onToggle} className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            {section}
            <span className="font-mono font-normal normal-case tracking-normal text-[var(--color-text-muted)]">({items.length})</span>
          </button>
        </td>
      </tr>
      {!isCollapsed && items.map(item => (
        <MeasurementItemBlock key={item.id} item={item} selected={selectedId === item.id} onSelect={onSelect} />
      ))}
      {!isCollapsed && (
        <tr className="border-b border-[var(--color-border)]">
          <td colSpan={6} className="px-3 py-1.5 text-end text-[11px] font-semibold text-[var(--color-text-secondary)]">Section total</td>
          <td className="px-3 py-1.5 text-end mono font-semibold text-[var(--color-text)]">{fmt(sectionTotal)}</td>
        </tr>
      )}
    </>
  )
}

function MeasurementItemBlock({ item, selected, onSelect }: { item: MeasurementItem; selected: boolean; onSelect: (i: MeasurementItem | null) => void }) {
  const lines = item.lines ?? []
  return (
    <>
      <tr
        onClick={() => onSelect(selected ? null : item)}
        className={cn(
          'cursor-pointer border-b border-[var(--color-border-light)] transition-colors',
          selected ? 'bg-[var(--color-brand-tint)]' : 'hover:bg-[var(--color-surface-hover)]'
        )}
      >
        <td className="px-2 py-1.5">
          <SelectionBracket active={selected} className="text-[var(--color-brand)]" />
        </td>
        <td colSpan={4} className="px-2 py-1.5 mono text-[11px] text-[var(--color-text-muted)] border-e-2 border-double border-[var(--color-border-strong)]">{item.item_code ?? '—'}</td>
        <td className="px-3 py-1.5 font-medium text-[var(--color-text)]">{item.description}</td>
        <td className="px-2 py-1.5 text-[var(--color-text-secondary)]">{item.unit}</td>
        <td className="px-3 py-1.5 text-end mono font-semibold text-[var(--color-text)]">{item.net_qty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
      </tr>
      {selected && lines.map(line => (
        <tr key={line.id} className={cn('border-b border-[var(--color-border-light)]', line.is_deduction && 'bg-[var(--color-danger-tint)]/40')}>
          <td />
          <td className="px-2 py-1 mono text-end text-[var(--color-text-secondary)]">{line.nr ?? 1}</td>
          <td className="px-2 py-1 mono text-end text-[var(--color-text-secondary)]">{dim(line.length)}</td>
          <td className="px-2 py-1 mono text-end text-[var(--color-text-secondary)]">{dim(line.width)}</td>
          <td className="px-2 py-1 mono text-end text-[var(--color-text-secondary)] border-e-2 border-double border-[var(--color-border)]">{dim(line.height)}</td>
          <td className="px-3 py-1 text-[var(--color-text-muted)] italic">
            {line.is_deduction && <DeductMark size={11} className="inline mr-1.5 -mt-0.5 text-[var(--color-danger)]" />}
            {line.description || line.location || '—'}
          </td>
          <td />
          <td className={cn('px-3 py-1 text-end mono', line.is_deduction ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-secondary)]')}>
            {line.is_deduction ? '−' : ''}{line.quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </td>
        </tr>
      ))}
    </>
  )
}
