'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Project } from '@/lib/types'

import { useWorkspace } from './workspace-context'
import { LeftPanel } from './left-panel'
import { EvidenceCenter } from './evidence-center'
import { BottomDock } from './bottom-dock'
import { useResizable } from './use-resizable'
import { Drawer } from '@/components/ui/drawer'
import { ScaleMark } from '@/components/icons/marks'
import { ShortcutsDialog } from './shortcuts-dialog'
import { useKeyboardShortcuts, type ShortcutBinding } from '@/lib/hooks/use-keyboard-shortcuts'

import { DrawingsMode } from './modes/drawings-mode'
import { TakeoffMode } from './modes/takeoff-mode'
import { MeasurementBookMode } from './modes/measurement-book-mode'
import { QcsMode } from './modes/qcs-mode'
import { BoqMode } from './modes/boq-mode'
import { PricingMode } from './modes/pricing-mode'
import { PaymentsMode } from './modes/payments-mode'
import { ReportsMode } from './modes/reports-mode'
import { AiAssistantMode } from './modes/ai-assistant-mode'

import {
  PanelLeft, PanelRight,
  FileImage, Ruler, BookOpen, ClipboardList, FileSpreadsheet,
  Calculator, Receipt, FileBarChart, Sparkles, Keyboard,
} from 'lucide-react'

export type Mode = 'drawings' | 'takeoff' | 'measurement-book' | 'qcs' | 'boq' | 'pricing' | 'payments' | 'reports' | 'ai-assistant'

export const MODES: { key: Mode; label: string; icon: typeof FileImage; hasSidePanels: boolean }[] = [
  { key: 'drawings', label: 'Drawings', icon: FileImage, hasSidePanels: true },
  { key: 'takeoff', label: 'Takeoff', icon: Ruler, hasSidePanels: true },
  { key: 'measurement-book', label: 'Measurement Book', icon: BookOpen, hasSidePanels: true },
  { key: 'qcs', label: 'QCS', icon: ClipboardList, hasSidePanels: true },
  { key: 'boq', label: 'BOQ', icon: FileSpreadsheet, hasSidePanels: true },
  { key: 'pricing', label: 'Pricing', icon: Calculator, hasSidePanels: true },
  { key: 'payments', label: 'Payments', icon: Receipt, hasSidePanels: true },
  { key: 'reports', label: 'Reports', icon: FileBarChart, hasSidePanels: false },
  { key: 'ai-assistant', label: 'AI Assistant', icon: Sparkles, hasSidePanels: false },
]

export function WorkspaceShell({ projectId, project, initialMode }: { projectId: string; project: Project; initialMode?: Mode }) {
  const { selection } = useWorkspace()
  const [mode, setMode] = useState<Mode>(initialMode ?? 'drawings')
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [mobilePanel, setMobilePanel] = useState<'explorer' | 'inspector' | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const leftResize = useResizable({ direction: 'horizontal', initialSize: 260, minSize: 200, maxSize: 400, storageKey: 'ws-left' })
  const rightResize = useResizable({ direction: 'horizontal', initialSize: 340, minSize: 280, maxSize: 500, storageKey: 'ws-right' })

  useKeyboardShortcuts(
    [
      ...MODES.map((m, i): ShortcutBinding => ({ key: String(i + 1), handler: () => setMode(m.key) })),
      { key: '[', meta: true, handler: () => setLeftOpen(v => !v) },
      { key: ']', meta: true, handler: () => setRightOpen(v => !v) },
      { key: '?', shift: true, handler: () => setShortcutsOpen(v => !v) },
    ],
    []
  )

  const activeMode = MODES.find(m => m.key === mode)!
  const showSidePanels = activeMode.hasSidePanels

  const renderMain = () => {
    switch (mode) {
      case 'drawings': return <DrawingsMode />
      case 'takeoff': return <TakeoffMode projectId={projectId} />
      case 'measurement-book': return <MeasurementBookMode />
      case 'qcs': return <QcsMode />
      case 'boq': return <BoqMode />
      case 'pricing': return <PricingMode />
      case 'payments': return <PaymentsMode />
      case 'reports': return <ReportsMode project={project} />
      case 'ai-assistant': return <AiAssistantMode projectId={projectId} />
    }
  }

  const selectionLabel =
    selection.type === 'boq' ? selection.boqItem?.description
    : selection.type === 'drawing' ? selection.drawing?.name
    : selection.type === 'measurement' ? selection.measurement?.description
    : selection.type === 'library-item' ? selection.libraryItem?.description
    : null

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-[var(--background)] overflow-hidden">
      {/* Top chrome */}
      <div className="flex items-center gap-1 h-11 px-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5 pe-2 shrink-0" title="Angel D.C.">
          <ScaleMark size={16} className="text-[var(--color-brand)]" />
          <span className="hidden sm:inline text-[12px] font-semibold tracking-tight text-[var(--color-text)]">Angel D.C.</span>
        </div>
        <div className="w-px h-5 bg-[var(--color-border)] mx-0.5 shrink-0" />
        <button
          onClick={() => setLeftOpen(v => !v)}
          title="Toggle explorer (⌘[)"
          className={cn('hidden lg:flex p-1.5 rounded-[var(--radius-sm)] shrink-0 transition-colors focus-ring', leftOpen ? 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]' : 'text-[var(--color-brand)] bg-[var(--color-brand-tint)]')}
        >
          <PanelLeft size={14} />
        </button>
        <button
          onClick={() => setMobilePanel('explorer')}
          title="Explorer"
          className="lg:hidden p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] shrink-0 transition-colors focus-ring"
        >
          <PanelLeft size={14} />
        </button>

        <div className="w-px h-5 bg-[var(--color-border)] mx-0.5 shrink-0" />

        <div className="flex items-stretch gap-0.5">
          {MODES.map(m => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              title={m.label}
              className={cn(
                'relative flex items-center gap-1.5 px-2.5 h-11 text-[13px] font-medium whitespace-nowrap transition-colors focus-ring',
                mode === m.key ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              )}
            >
              <m.icon size={13} />
              <span className="hidden xl:inline">{m.label}</span>
              {mode === m.key && (
                <motion.span
                  layoutId="mode-indicator"
                  className="absolute inset-x-1.5 bottom-0 h-[2px] rounded-full bg-[var(--color-brand)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-2" />

        {selectionLabel && (
          <span className="hidden md:inline text-[11px] text-[var(--color-text-muted)] truncate max-w-[220px] mx-2">
            {selectionLabel}
          </span>
        )}

        {showSidePanels && (
          <>
            <button
              onClick={() => setRightOpen(v => !v)}
              title="Toggle inspector (⌘])"
              className={cn('hidden lg:flex p-1.5 rounded-[var(--radius-sm)] shrink-0 transition-colors focus-ring', rightOpen ? 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]' : 'text-[var(--color-brand)] bg-[var(--color-brand-tint)]')}
            >
              <PanelRight size={14} />
            </button>
            <button
              onClick={() => setMobilePanel('inspector')}
              title="Inspector"
              className="lg:hidden p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] shrink-0 transition-colors focus-ring"
            >
              <PanelRight size={14} />
            </button>
          </>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {showSidePanels && leftOpen && (
          <>
            <div style={{ width: leftResize.size }} className="hidden lg:block shrink-0 overflow-hidden border-e border-[var(--color-border)]">
              <LeftPanel />
            </div>
            <div
              onMouseDown={leftResize.handleMouseDown}
              className={cn('hidden lg:block w-1 shrink-0 cursor-col-resize', leftResize.isResizing ? 'bg-[var(--color-brand)]/20' : 'hover:bg-[var(--color-brand)]/10')}
            />
          </>
        )}

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-hidden">{renderMain()}</div>
          {(mode === 'drawings' || mode === 'takeoff') && (
            <div className="h-[220px] shrink-0 overflow-hidden hidden md:block">
              <BottomDock projectId={projectId} projectName={project.name} />
            </div>
          )}
        </div>

        {showSidePanels && rightOpen && (
          <>
            <div
              onMouseDown={e => {
                e.preventDefault()
                const startX = e.clientX
                const startSize = rightResize.size
                const onMove = (me: MouseEvent) => rightResize.setSize(Math.max(280, Math.min(500, startSize + (startX - me.clientX))))
                const onUp = () => {
                  document.removeEventListener('mousemove', onMove)
                  document.removeEventListener('mouseup', onUp)
                  document.body.style.cursor = ''
                }
                document.addEventListener('mousemove', onMove)
                document.addEventListener('mouseup', onUp)
                document.body.style.cursor = 'col-resize'
              }}
              className="hidden lg:block w-1 shrink-0 cursor-col-resize hover:bg-[var(--color-brand)]/10"
            />
            <div style={{ width: rightResize.size }} className="hidden lg:block shrink-0 overflow-hidden border-s border-[var(--color-border)]">
              <EvidenceCenter />
            </div>
          </>
        )}
      </div>

      {/* Status bar */}
      <div className="hidden sm:flex items-center gap-4 h-6 px-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 text-[10px] font-mono text-[var(--color-text-muted)]">
        <span>{project.currency}</span>
        <span>Mode: {activeMode.label}</span>
        <span className="flex-1" />
        <button
          onClick={() => setShortcutsOpen(true)}
          className="flex items-center gap-1.5 hover:text-[var(--color-text-secondary)] transition-colors"
        >
          <Keyboard size={11} /> Shortcuts
        </button>
      </div>

      {/* Mobile panel drawers */}
      <Drawer isOpen={mobilePanel === 'explorer'} onClose={() => setMobilePanel(null)} title="Explorer" side="start">
        <LeftPanel />
      </Drawer>
      <Drawer isOpen={mobilePanel === 'inspector'} onClose={() => setMobilePanel(null)} title="Inspector" side="end">
        <EvidenceCenter />
      </Drawer>

      <ShortcutsDialog isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} modes={MODES} />
    </div>
  )
}
