'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Kbd } from '@/components/ui/kbd'
import { Tabs, TabsList, TabsTrigger, TabsPanel } from '@/components/ui/tabs'
import { SelectionBracket, DeductMark, TraceMark, VerifiedMark } from '@/components/icons/marks'
import type { LucideIcon } from 'lucide-react'

interface Mode { key: string; label: string; icon: LucideIcon }

const WORKFLOW: { mode: string; blurb: string }[] = [
  { mode: 'Drawings', blurb: 'Browse the project’s sheets — the source everything else traces back to.' },
  { mode: 'Takeoff', blurb: 'Measure directly on a drawing. Every shape you draw becomes a dimension.' },
  { mode: 'Measurement Book', blurb: 'The dimension sheet — every measurement, grouped and totalled, exactly as it was taken off.' },
  { mode: 'QCS', blurb: 'Checks measured quantities against what’s billed, so a mismatch is caught here, not by the client.' },
  { mode: 'BOQ', blurb: 'The priced bill — item by item, section by section.' },
  { mode: 'Pricing', blurb: 'How each rate is built up: material, labour, plant, overhead and profit.' },
  { mode: 'Payments', blurb: 'Progress certificates — what’s been valued and paid so far.' },
  { mode: 'Reports', blurb: 'Export-ready output for whoever isn’t working inside the tool.' },
  { mode: 'AI Assistant', blurb: 'Ask about the project. It only answers from what’s actually in it.' },
]

const MARKS: { icon: React.ReactNode; name: string; meaning: string }[] = [
  { icon: <SelectionBracket size={16} active className="text-[var(--color-brand)]" />, name: 'Squaring bracket', meaning: 'This row is selected.' },
  { icon: <DeductMark size={15} className="text-[var(--color-danger)]" />, name: 'Hatch', meaning: 'A deduction — subtracted from the total.' },
  { icon: <TraceMark size={15} className="text-[var(--color-brand)]" />, name: 'Thread', meaning: 'This figure links back to a source — a drawing or a measurement.' },
  { icon: <VerifiedMark size={16} className="text-[var(--color-success)]" />, name: 'Bracket + check', meaning: 'The computed quantity matches what’s billed.' },
]

export function HelpDialog({
  isOpen, onClose, modes,
}: { isOpen: boolean; onClose: () => void; modes: Mode[] }) {
  const [tab, setTab] = useState<'guide' | 'shortcuts'>('guide')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Help" size="md">
      <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
        <TabsList className="border-b border-[var(--color-border)] -mx-6 px-6 mb-4">
          <TabsTrigger value="guide">Guide</TabsTrigger>
          <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
        </TabsList>

        <TabsPanel value="guide">
          <div className="space-y-5">
            <section>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">The workflow, in order</h4>
              <div className="space-y-2.5">
                {WORKFLOW.map((w, i) => (
                  <div key={w.mode} className="flex gap-3">
                    <span className="mono text-[11px] text-[var(--color-text-muted)] w-4 shrink-0 pt-0.5">{i + 1}</span>
                    <div>
                      <div className="text-[13px] font-medium text-[var(--color-text)]">{w.mode}</div>
                      <div className="text-[12px] text-[var(--color-text-muted)] leading-snug">{w.blurb}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">What the marks mean</h4>
              <div className="space-y-2">
                {MARKS.map(m => (
                  <div key={m.name} className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] shrink-0">{m.icon}</span>
                    <div>
                      <span className="text-[12.5px] font-medium text-[var(--color-text)]">{m.name}</span>
                      <span className="text-[12px] text-[var(--color-text-muted)]"> — {m.meaning}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </TabsPanel>

        <TabsPanel value="shortcuts">
          <div className="space-y-5">
            <section>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Switch mode</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {modes.slice(0, 9).map((m, i) => (
                  <div key={m.key} className="flex items-center justify-between gap-3 py-1">
                    <span className="flex items-center gap-2 text-[13px] text-[var(--color-text)]">
                      <m.icon size={13} className="text-[var(--color-text-muted)]" />
                      {m.label}
                    </span>
                    <Kbd keys={[String(i + 1)]} />
                  </div>
                ))}
              </div>
              {modes.length > 9 && (
                <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                  <p className="text-[11px] text-[var(--color-text-muted)] mb-2">Also in this workspace — no shortcut, click the icon or use ⌘P:</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {modes.slice(9).map(m => (
                      <span key={m.key} className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)] py-1">
                        <m.icon size={13} className="text-[var(--color-text-muted)]" />
                        {m.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
            <section>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Workspace</h4>
              <div className="space-y-1.5">
                {[
                  { label: 'Jump to a BOQ item, drawing or measurement', keys: ['⌘', 'P'] },
                  { label: 'Open explorer', keys: ['⌘', '['] },
                  { label: 'Dismiss inspector', keys: ['⌘', ']'] },
                  { label: 'Select a row · Cmd/Ctrl+click to add · Shift+click a range', keys: ['click'] },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between gap-4 py-1">
                    <span className="text-[13px] text-[var(--color-text)]">{s.label}</span>
                    <Kbd keys={s.keys} />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </TabsPanel>
      </Tabs>
    </Modal>
  )
}
