'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

/** The floating strip that appears the moment a second row gets multi-selected — never reserves space when nothing is selected. */
export function SelectionBar({ count, onClear, children }: { count: number; onClear: () => void; children?: ReactNode }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-4 start-1/2 -translate-x-1/2 z-[var(--z-sticky)] flex items-center gap-3 px-3 py-2 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] border border-[var(--color-border-strong)] shadow-[var(--shadow-xl)]"
        >
          <span className="text-[12.5px] font-medium text-[var(--color-text)]">{count} selected</span>
          {children}
          <button
            onClick={onClear}
            title="Clear selection (Esc)"
            aria-label="Clear selection"
            className="flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors"
          >
            <X size={13} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
