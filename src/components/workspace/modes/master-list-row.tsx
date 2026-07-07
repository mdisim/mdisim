'use client'

import { cn } from '@/lib/utils'
import { SelectionBracket } from '@/components/icons/marks'
import type { ReactNode } from 'react'

/** The one master-list row pattern shared by every mode with a rail of records (Pricing, Payments, …) — same selection mark, same two-line layout, everywhere it appears. */
export function MasterListRow({
  selected, onClick, title, titleTrailing, metaLeft, metaRight,
}: {
  selected: boolean
  onClick: () => void
  title: ReactNode
  titleTrailing?: ReactNode
  metaLeft: ReactNode
  metaRight: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full text-start ps-5 pe-3 py-2.5 border-b border-[var(--color-border-light)] transition-colors',
        selected ? 'bg-[var(--color-brand-tint)]' : 'hover:bg-[var(--color-surface-hover)]'
      )}
    >
      <span className="absolute start-1.5 top-1/2 -translate-y-1/2">
        <SelectionBracket active={selected} className="text-[var(--color-brand)]" />
      </span>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-[var(--color-text)] truncate">{title}</span>
        {titleTrailing}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[11px] text-[var(--color-text-muted)] truncate">{metaLeft}</span>
        <span className="mono text-[12px] font-semibold text-[var(--color-text)] shrink-0 ms-2">{metaRight}</span>
      </div>
    </button>
  )
}
