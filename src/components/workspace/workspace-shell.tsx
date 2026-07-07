'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Project } from '@/lib/types'

import { useWorkspace } from './workspace-context'
import { LeftPanel } from './left-panel'
import { EvidenceCenter } from './evidence-center'
import { BottomDock } from './bottom-dock'
import { Drawer } from '@/components/ui/drawer'
import { ScaleMark } from '@/components/icons/marks'
import { ShortcutsDialog } from './shortcuts-dialog'
import { QuickSwitcher } from './quick-switcher'
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
  PanelLeft, Layers,
  FileImage, Ruler, BookOpen, ClipboardList, FileSpreadsheet,
  Calculator, Receipt, FileBarChart, Sparkles, Keyboard, Search,
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

/**
 * Nothing here is docked. The canvas is the only permanent surface — the
 * explorer, the inspector and the insights dock are all overlays that appear
 * on request (or, for the inspector, the moment there's something to inspect)
 * and give the full width straight back when dismissed. Cross-project
 * navigation happens through ⌘P rather than a tree you keep open just in
 * case you need it.
 */
export function WorkspaceShell({ projectId, project, initialMode }: { projectId: string; project: Project; initialMode?: Mode }) {
  const { selection } = useWorkspace()
  const [mode, setMode] = useState<Mode>(initialMode ?? 'drawings')
  const [explorerOpen, setExplorerOpen] = useState(false)
  const [inspectorSuppressed, setInspectorSuppressed] = useState(false)
  const [dockOpen, setDockOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)

  // The inspector only has real content for a BOQ selection today — it opens
  // itself the instant one exists and closes itself the instant it doesn't.
  // The toggle is just an override for someone who wants it out of the way.
  const hasInspectableSelection = selection.type === 'boq'
  const inspectorOpen = hasInspectableSelection && !inspectorSuppressed

  useEffect(() => {
    if (hasInspectableSelection) setInspectorSuppressed(false)
  }, [hasInspectableSelection])

  useKeyboardShortcuts(
    [
      ...MODES.map((m, i): ShortcutBinding => ({ key: String(i + 1), handler: () => setMode(m.key) })),
      { key: '[', meta: true, handler: () => setExplorerOpen(v => !v) },
      { key: ']', meta: true, handler: () => setInspectorSuppressed(v => !v) },
      { key: 'p', meta: true, handler: () => setSwitcherOpen(v => !v) },
      { key: '?', shift: true, handler: () => setShortcutsOpen(v => !v) },
    ],
    []
  )

  const activeMode = MODES.find(m => m.key === mode)!
  const showSidePanels = activeMode.hasSidePanels
  const showDock = mode === 'drawings' || mode === 'takeoff'

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
      {/* Instrument titlebar — icons only, tooltips carry the labels. Height is
          minimised on purpose: this row exists to switch context, not to be looked at. */}
      <div className="flex items-center gap-0.5 h-9 px-1.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 overflow-x-auto">
        <div className="flex items-center justify-center w-7 h-7 shrink-0" title="Angel D.C.">
          <ScaleMark size={15} className="text-[var(--color-brand)]" />
        </div>
        <button
          onClick={() => setExplorerOpen(true)}
          title="Explorer (⌘[)"
          aria-label="Explorer"
          className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] shrink-0 transition-colors focus-ring"
        >
          <PanelLeft size={14} />
        </button>
        <button
          onClick={() => setSwitcherOpen(true)}
          title="Jump to… (⌘P)"
          aria-label="Jump to"
          className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] shrink-0 transition-colors focus-ring"
        >
          <Search size={14} />
        </button>

        <div className="w-px h-4 bg-[var(--color-border)] mx-1 shrink-0" />

        <div className="flex items-stretch gap-0.5">
          {MODES.map(m => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              title={m.label}
              aria-label={m.label}
              className={cn(
                'relative flex items-center justify-center w-8 h-9 transition-colors focus-ring',
                mode === m.key ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              )}
            >
              <m.icon size={15} />
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

        {showDock && (
          <button
            onClick={() => setDockOpen(true)}
            title="Insights"
            aria-label="Insights"
            className="flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] shrink-0 transition-colors focus-ring"
          >
            <Layers size={14} />
          </button>
        )}
        {showSidePanels && (
          <button
            onClick={() => setInspectorSuppressed(v => !v)}
            title="Toggle inspector (⌘])"
            aria-label="Toggle inspector"
            className={cn('flex items-center justify-center w-7 h-7 rounded-[var(--radius-sm)] shrink-0 transition-colors focus-ring', inspectorOpen ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]')}
          >
            <ClipboardList size={14} />
          </button>
        )}
      </div>

      {/* The canvas: always 100% width, always the hero. Every panel below is an overlay on top of it, never beside it. */}
      <div className="flex-1 overflow-hidden">{renderMain()}</div>

      {/* Status bar */}
      <div className="hidden sm:flex items-center gap-4 h-6 px-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 text-[10px] font-mono text-[var(--color-text-muted)]">
        <span>{project.currency}</span>
        <span>{activeMode.label}</span>
        {selectionLabel && <span className="truncate max-w-[360px] text-[var(--color-text-secondary)]">{selectionLabel}</span>}
        <span className="flex-1" />
        <button
          onClick={() => setShortcutsOpen(true)}
          className="flex items-center gap-1.5 hover:text-[var(--color-text-secondary)] transition-colors"
        >
          <Keyboard size={11} /> Shortcuts
        </button>
      </div>

      {/* Overlays — none of these ever reserve layout space */}
      <Drawer isOpen={explorerOpen} onClose={() => setExplorerOpen(false)} title="Explorer" side="start">
        <LeftPanel />
      </Drawer>
      <Drawer isOpen={inspectorOpen} onClose={() => setInspectorSuppressed(true)} title="Inspector" side="end">
        <EvidenceCenter />
      </Drawer>
      {showDock && (
        <Drawer isOpen={dockOpen} onClose={() => setDockOpen(false)} title="Insights" side="bottom">
          <BottomDock />
        </Drawer>
      )}

      <QuickSwitcher isOpen={switcherOpen} onClose={() => setSwitcherOpen(false)} setMode={setMode} />
      <ShortcutsDialog isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} modes={MODES} />
    </div>
  )
}
