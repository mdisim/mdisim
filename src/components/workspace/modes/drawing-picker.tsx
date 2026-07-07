'use client'

import { EmptyState } from '@/components/ui/empty-state'
import { FileImage } from 'lucide-react'
import type { Drawing } from '@/lib/types'

/** Shared sheet-picker grid for Drawings and Takeoff modes — keeps the "choose a sheet" moment identical everywhere it appears. */
export function DrawingPicker({ drawings, eyebrow, emptyTitle, onSelect }: {
  drawings: Drawing[]
  eyebrow: string
  emptyTitle: string
  onSelect: (d: Drawing) => void
}) {
  if (drawings.length === 0) {
    return <EmptyState icon={FileImage} title={emptyTitle} description="Upload a drawing to this project to get started." />
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] mb-3">{eyebrow}</p>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {drawings.map(d => (
          <button
            key={d.id}
            onClick={() => onSelect(d)}
            className="text-start surface-elevated rounded-[var(--radius-lg)] border border-[var(--color-border)] p-3 hover-lift hover:border-[var(--color-border-strong)] focus-ring"
          >
            <div className="w-full aspect-[4/3] rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] flex items-center justify-center mb-2.5 text-[var(--color-text-muted)]">
              <FileImage size={22} strokeWidth={1.5} />
            </div>
            <div className="text-[13px] font-medium text-[var(--color-text)] truncate">{d.name}</div>
            <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5 font-mono uppercase tracking-wide">
              Rev {d.revision_number ?? '—'} · {d.file_type}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
