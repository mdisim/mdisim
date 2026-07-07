'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

import { getBOQItems } from '@/app/actions/boq'
import { getDrawings, getDrawingMeasurements } from '@/app/actions/drawings'
import { getMeasurementItems } from '@/app/actions/measurements'
import { getLibraryCategories, getLibraryItems } from '@/app/actions/library'
import { getContract, getCostEntries, getVariations } from '@/app/actions/cost-control'
import { getRateAnalyses } from '@/app/actions/rate-analysis'
import { getPaymentCerts } from '@/app/actions/payments'
import { getDrawingRevisionsForProject } from '@/app/actions/drawing-revisions'
import { getQuantityChanges } from '@/app/actions/drawing-revisions'
import { getProject } from '@/app/actions/projects'

import type {
  Drawing, DrawingRevision, DrawingMeasurement, LibraryItem, Project,
} from '@/lib/types'

import { WorkspaceProvider, type WorkspaceData, useWorkspace } from '@/components/workspace/workspace-context'
import { LeftPanel } from '@/components/workspace/left-panel'
import { EvidenceCenter } from '@/components/workspace/evidence-center'
import { BottomDock } from '@/components/workspace/bottom-dock'
import { useResizable } from '@/components/workspace/use-resizable'
import { Drawer } from '@/components/ui/drawer'
import { Skeleton } from '@/components/ui/skeleton'
import { ScaleMark } from '@/components/icons/marks'
import { ShortcutsDialog } from '@/components/workspace/shortcuts-dialog'
import { useKeyboardShortcuts, type ShortcutBinding } from '@/lib/hooks/use-keyboard-shortcuts'

import { DrawingsMode } from '@/components/workspace/modes/drawings-mode'
import { TakeoffMode } from '@/components/workspace/modes/takeoff-mode'
import { MeasurementBookMode } from '@/components/workspace/modes/measurement-book-mode'
import { QcsMode } from '@/components/workspace/modes/qcs-mode'
import { BoqMode } from '@/components/workspace/modes/boq-mode'
import { PricingMode } from '@/components/workspace/modes/pricing-mode'
import { PaymentsMode } from '@/components/workspace/modes/payments-mode'
import { ReportsMode } from '@/components/workspace/modes/reports-mode'
import { AiAssistantMode } from '@/components/workspace/modes/ai-assistant-mode'

import {
  PanelLeft, PanelRight, AlertTriangle, RefreshCw,
  FileImage, Ruler, BookOpen, ClipboardList, FileSpreadsheet,
  Calculator, Receipt, FileBarChart, Sparkles, Keyboard,
} from 'lucide-react'

type Mode = 'drawings' | 'takeoff' | 'measurement-book' | 'qcs' | 'boq' | 'pricing' | 'payments' | 'reports' | 'ai-assistant'

const MODES: { key: Mode; label: string; icon: typeof FileImage; hasSidePanels: boolean }[] = [
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

function WorkspaceShell({ projectId, project }: { projectId: string; project: Project }) {
  const { selection } = useWorkspace()
  const [mode, setMode] = useState<Mode>('drawings')
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

export default function WorkspacePage() {
  const { id: projectId } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<WorkspaceData | null>(null)
  const [project, setProject] = useState<Project | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [proj, boqItems, drawings, measurementItems, categories, contract, costEntries, variations, rateAnalyses, payments, allRevisions, quantityChanges] = await Promise.all([
        getProject(projectId),
        getBOQItems(projectId),
        getDrawings(projectId),
        getMeasurementItems(projectId),
        getLibraryCategories(),
        getContract(projectId).catch(() => null),
        getCostEntries(projectId).catch(() => []),
        getVariations(projectId).catch(() => []),
        getRateAnalyses(projectId).catch(() => []),
        getPaymentCerts(projectId).catch(() => []),
        getDrawingRevisionsForProject(projectId).catch(() => []),
        getQuantityChanges(projectId).catch(() => []),
      ])

      setProject(proj)

      const revisions: Record<string, DrawingRevision[]> = {}
      for (const rev of allRevisions) {
        if (!revisions[rev.drawing_id]) revisions[rev.drawing_id] = []
        revisions[rev.drawing_id].push(rev)
      }

      const drawingMeasurements: Record<string, DrawingMeasurement[]> = {}
      const dmResults = await Promise.all(
        drawings.map((d: Drawing) => getDrawingMeasurements(d.id).catch(() => [] as DrawingMeasurement[]))
      )
      drawings.forEach((d: Drawing, i: number) => { drawingMeasurements[d.id] = dmResults[i] })

      let libraryItems: LibraryItem[] = []
      if (categories.length > 0) {
        const allItems = await Promise.all(categories.map(c => getLibraryItems(c.id).catch(() => [] as LibraryItem[])))
        libraryItems = allItems.flat()
      }

      setData({
        boqItems, drawings, measurementItems, categories, libraryItems,
        contract, costEntries, variations, revisions, rateAnalyses,
        payments, drawingMeasurements, quantityChanges,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace data')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden animate-fade-in">
        <div className="flex items-center gap-2 h-11 px-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-16 rounded" />
          ))}
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="hidden lg:block w-[260px] shrink-0 border-e border-[var(--color-border)] p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full rounded" />
            ))}
          </div>
          <div className="flex-1 p-6 space-y-3">
            <Skeleton className="h-5 w-1/3 rounded" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded" />
            ))}
          </div>
          <div className="hidden lg:block w-[340px] shrink-0 border-s border-[var(--color-border)] p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !data || !project) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-[var(--radius-xl)] bg-[var(--color-danger-tint)] flex items-center justify-center">
            <AlertTriangle size={22} className="text-[var(--color-danger)]" />
          </div>
          <p className="text-sm text-[var(--color-danger)] max-w-xs">{error ?? 'Unknown error'}</p>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[var(--color-brand)] text-white rounded-[var(--radius-md)] hover:bg-[var(--color-brand-strong)]"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <WorkspaceProvider data={data}>
      <WorkspaceShell projectId={projectId} project={project} />
    </WorkspaceProvider>
  )
}
