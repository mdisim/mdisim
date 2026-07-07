'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useWorkspace } from './workspace-context'
import type { Mode } from './workspace-shell'
import { FileSpreadsheet, FileImage, Ruler, Search } from 'lucide-react'

interface Result {
  id: string
  kind: 'boq' | 'drawing' | 'measurement'
  code: string | null
  title: string
  meta: string
  go: () => void
}

/**
 * The replacement for tree-browsing: press ⌘P from anywhere in the workspace,
 * type a code or description, land directly on it — in whichever mode shows
 * it best — instead of hunting through a permanently-docked project tree.
 */
export function QuickSwitcher({ isOpen, onClose, setMode }: { isOpen: boolean; onClose: () => void; setMode: (m: Mode) => void }) {
  const { data, selectBoqItem, selectDrawing, selectMeasurement } = useWorkspace()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setIndex(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [isOpen])

  const results: Result[] = useMemo(() => {
    const boq: Result[] = data.boqItems.map(b => ({
      id: `boq-${b.id}`, kind: 'boq', code: b.code, title: b.description, meta: b.unit,
      go: () => { selectBoqItem(b); setMode('boq') },
    }))
    const drawings: Result[] = data.drawings.map(d => ({
      id: `dwg-${d.id}`, kind: 'drawing', code: d.drawing_number, title: d.name, meta: d.file_type.toUpperCase(),
      go: () => { selectDrawing(d); setMode('drawings') },
    }))
    const measurements: Result[] = data.measurementItems.map(m => ({
      id: `mi-${m.id}`, kind: 'measurement', code: m.item_code, title: m.description, meta: m.unit,
      go: () => { selectMeasurement(m); setMode('measurement-book') },
    }))
    const all = [...boq, ...drawings, ...measurements]
    if (!query.trim()) return all.slice(0, 8)
    const q = query.toLowerCase()
    return all.filter(r => r.title.toLowerCase().includes(q) || r.code?.toLowerCase().includes(q)).slice(0, 30)
  }, [data, query, selectBoqItem, selectDrawing, selectMeasurement, setMode])

  useEffect(() => { setIndex(0) }, [query])

  const commit = (r: Result) => { r.go(); onClose() }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && results[index]) { e.preventDefault(); commit(results[index]) }
    else if (e.key === 'Escape') onClose()
  }

  const icons = { boq: FileSpreadsheet, drawing: FileImage, measurement: Ruler }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)]" role="dialog" aria-modal="true" aria-label="Quick switcher">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
            className="absolute inset-0 bg-[var(--color-surface-overlay)]"
            onClick={onClose}
          />
          <div className="flex items-start justify-center pt-[14vh] px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -6 }}
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="w-full max-w-lg bg-[var(--color-surface-elevated)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xl)] border border-[var(--color-border)] overflow-hidden"
            >
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--color-border)]">
                <Search size={15} className="text-[var(--color-text-muted)] shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Jump to a BOQ item, drawing or measurement…"
                  className="flex-1 text-[13px] bg-transparent outline-none text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
                />
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-sunken)] rounded-[var(--radius-xs)]">ESC</kbd>
              </div>
              <div className="max-h-[50vh] overflow-y-auto py-1.5">
                {results.length === 0 && (
                  <div className="px-4 py-6 text-center text-[12.5px] text-[var(--color-text-muted)]">No matches</div>
                )}
                {results.map((r, i) => {
                  const Icon = icons[r.kind]
                  return (
                    <button
                      key={r.id}
                      onMouseEnter={() => setIndex(i)}
                      onClick={() => commit(r)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-4 py-2 text-start transition-colors',
                        i === index ? 'bg-[var(--color-brand-tint)]' : 'hover:bg-[var(--color-surface-hover)]'
                      )}
                    >
                      <Icon size={13} className="text-[var(--color-text-muted)] shrink-0" />
                      {r.code && <span className="mono text-[11px] text-[var(--color-text-muted)] shrink-0">{r.code}</span>}
                      <span className="text-[12.5px] text-[var(--color-text)] truncate flex-1">{r.title}</span>
                      <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">{r.meta}</span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
