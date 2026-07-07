'use client'

import { Modal } from '@/components/ui/modal'
import { Kbd } from '@/components/ui/kbd'
import type { LucideIcon } from 'lucide-react'

interface ShortcutRow {
  label: string
  keys: string[]
}

export function ShortcutsDialog({
  isOpen, onClose, modes,
}: { isOpen: boolean; onClose: () => void; modes: { key: string; label: string; icon: LucideIcon }[] }) {
  const generalShortcuts: ShortcutRow[] = [
    { label: 'Toggle explorer', keys: ['⌘', '['] },
    { label: 'Toggle inspector', keys: ['⌘', ']'] },
    { label: 'Command palette', keys: ['⌘', 'K'] },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard shortcuts" size="md">
      <div className="space-y-5">
        <section>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Switch mode</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {modes.map((m, i) => (
              <div key={m.key} className="flex items-center justify-between gap-3 py-1">
                <span className="flex items-center gap-2 text-[13px] text-[var(--color-text)]">
                  <m.icon size={13} className="text-[var(--color-text-muted)]" />
                  {m.label}
                </span>
                <Kbd keys={[String(i + 1)]} />
              </div>
            ))}
          </div>
        </section>
        <section>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Workspace</h4>
          <div className="space-y-1.5">
            {generalShortcuts.map(s => (
              <div key={s.label} className="flex items-center justify-between py-1">
                <span className="text-[13px] text-[var(--color-text)]">{s.label}</span>
                <Kbd keys={s.keys} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  )
}
