'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
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
  Drawing, DrawingRevision, DrawingMeasurement, LibraryItem,
} from '@/lib/types'

import { WorkspaceProvider, type WorkspaceData } from '@/components/workspace/workspace-context'
import { LeftPanel } from '@/components/workspace/left-panel'
import { WorkspaceDrawingViewer } from '@/components/workspace/workspace-drawing-viewer'
import { EvidenceCenter } from '@/components/workspace/evidence-center'
import { BottomDock } from '@/components/workspace/bottom-dock'
import { BimViewer } from '@/components/workspace/bim-viewer'
import { useResizable } from '@/components/workspace/use-resizable'
import { useWorkspace } from '@/components/workspace/workspace-context'
import {
  PanelLeftClose, PanelRightClose,
  AlertTriangle, RefreshCw, Box,
  SplitSquareHorizontal, Image as ImageIcon,
} from 'lucide-react'

function ViewModeToggle() {
  const { viewMode, setViewMode } = useWorkspace()
  return (
    <div className="flex items-center bg-[var(--color-surface)] rounded-lg p-0.5 border border-[var(--color-border)]">
      {[
        { mode: '2d' as const, icon: ImageIcon, label: '2D' },
        { mode: '3d' as const, icon: Box, label: '3D' },
        { mode: 'split' as const, icon: SplitSquareHorizontal, label: 'Split' },
      ].map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all',
            viewMode === mode
              ? 'bg-[var(--color-amber)] text-[var(--color-on-amber)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          )}
        >
          <Icon size={10} />
          {label}
        </button>
      ))}
    </div>
  )
}

function WorkspaceInner({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { viewMode } = useWorkspace()
  const [leftVisible, setLeftVisible] = useState(true)
  const [rightVisible, setRightVisible] = useState(true)

  const leftResize = useResizable({ direction: 'horizontal', initialSize: 260, minSize: 200, maxSize: 400, storageKey: 'ws-left' })
  const rightResize = useResizable({ direction: 'horizontal', initialSize: 340, minSize: 280, maxSize: 500, storageKey: 'ws-right' })
  const bottomResize = useResizable({ direction: 'vertical', initialSize: 220, minSize: 36, maxSize: 400, storageKey: 'ws-bottom' })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '[' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setLeftVisible(v => !v) }
      if (e.key === ']' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setRightVisible(v => !v) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-[#0a0b0f] overflow-hidden">
      {/* Workspace Header — obsidian chrome */}
      <div className="flex items-center justify-between px-3 h-10 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Amber accent dot */}
          <div className="w-2 h-2 rounded-full bg-[var(--color-amber)]" />
          <span className="text-[11px] font-bold text-[var(--color-text)] tracking-tight">Workspace</span>
          <span className="text-[10px] font-mono text-[var(--color-text-muted)] truncate max-w-[160px]">{projectName}</span>
        </div>

        <div className="flex items-center gap-2">
          <ViewModeToggle />
          <div className="w-px h-4 bg-[var(--color-border)]" />
          <button
            onClick={() => setLeftVisible(!leftVisible)}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              leftVisible
                ? 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
                : 'text-[var(--color-amber)] bg-[var(--color-amber)]/10'
            )}
            title="Toggle explorer (⌘[)"
          >
            <PanelLeftClose size={13} />
          </button>
          <button
            onClick={() => setRightVisible(!rightVisible)}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              rightVisible
                ? 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
                : 'text-[var(--color-amber)] bg-[var(--color-amber)]/10'
            )}
            title="Toggle properties (⌘])"
          >
            <PanelRightClose size={13} />
          </button>
          <div className="hidden lg:flex items-center gap-0.5 text-[8px] text-[var(--color-text-muted)]">
            <kbd className="px-1 py-0.5 bg-[var(--color-surface-elevated)] rounded border border-[var(--color-border)]">⌘[</kbd>
            <kbd className="px-1 py-0.5 bg-[var(--color-surface-elevated)] rounded border border-[var(--color-border)]">⌘]</kbd>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Project Explorer */}
        {leftVisible && (
          <>
            <div style={{ width: leftResize.size }} className="shrink-0 overflow-hidden">
              <LeftPanel />
            </div>
            <div
              onMouseDown={leftResize.handleMouseDown}
              className={cn(
                'w-1 shrink-0 cursor-col-resize group relative',
                leftResize.isResizing ? 'bg-[var(--color-amber)]/20' : 'hover:bg-[var(--color-amber)]/10'
              )}
            >
              <div className={cn(
                'absolute inset-y-0 left-0 w-px',
                leftResize.isResizing ? 'bg-[var(--color-amber)]' : 'bg-[var(--color-border)] group-hover:bg-[var(--color-amber)]/60'
              )} />
            </div>
          </>
        )}

        {/* CENTER: Drawing Viewer / BIM / Split */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {viewMode === '2d' && <WorkspaceDrawingViewer />}
            {viewMode === '3d' && <BimViewer />}
            {viewMode === 'split' && (
              <div className="flex h-full">
                <div className="flex-1 overflow-hidden border-r border-[var(--color-border)]">
                  <WorkspaceDrawingViewer />
                </div>
                <div className="flex-1 overflow-hidden">
                  <BimViewer />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Dock resize handle */}
          <div
            onMouseDown={bottomResize.handleMouseDown}
            className={cn(
              'h-1 shrink-0 cursor-row-resize group relative',
              bottomResize.isResizing ? 'bg-[var(--color-amber)]/20' : 'hover:bg-[var(--color-amber)]/10'
            )}
          >
            <div className={cn(
              'absolute inset-x-0 top-0 h-px',
              bottomResize.isResizing ? 'bg-[var(--color-amber)]' : 'bg-[var(--color-border)] group-hover:bg-[var(--color-amber)]/60'
            )} />
          </div>
          <div style={{ height: bottomResize.size }} className="shrink-0 overflow-hidden">
            <BottomDock projectId={projectId} projectName={projectName} />
          </div>
        </div>

        {/* RIGHT: Dynamic Properties / Evidence Center */}
        {rightVisible && (
          <>
            <div
              onMouseDown={e => {
                e.preventDefault()
                const startX = e.clientX
                const startSize = rightResize.size
                const onMove = (me: MouseEvent) => {
                  const delta = startX - me.clientX
                  rightResize.setSize(Math.max(280, Math.min(500, startSize + delta)))
                }
                const onUp = () => {
                  document.removeEventListener('mousemove', onMove)
                  document.removeEventListener('mouseup', onUp)
                  document.body.style.cursor = ''
                  document.body.style.userSelect = ''
                }
                document.addEventListener('mousemove', onMove)
                document.addEventListener('mouseup', onUp)
                document.body.style.cursor = 'col-resize'
                document.body.style.userSelect = 'none'
              }}
              className="w-1 shrink-0 cursor-col-resize group relative hover:bg-[var(--color-amber)]/10"
            >
              <div className="absolute inset-y-0 right-0 w-px bg-[var(--color-border)] group-hover:bg-[var(--color-amber)]/60" />
            </div>
            <div style={{ width: rightResize.size }} className="shrink-0 overflow-hidden">
              <EvidenceCenter />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function WorkspacePage() {
  const { id: projectId } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<WorkspaceData | null>(null)
  const [projectName, setProjectName] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [project, boqItems, drawings, measurementItems, categories, contract, costEntries, variations, rateAnalyses, payments, allRevisions, quantityChanges] = await Promise.all([
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

      setProjectName(project?.name ?? 'Project')

      const revisions: Record<string, DrawingRevision[]> = {}
      for (const rev of allRevisions) {
        if (!revisions[rev.drawing_id]) revisions[rev.drawing_id] = []
        revisions[rev.drawing_id].push(rev)
      }

      const drawingMeasurements: Record<string, DrawingMeasurement[]> = {}
      const dmResults = await Promise.all(
        drawings.map(d => getDrawingMeasurements(d.id).catch(() => [] as DrawingMeasurement[]))
      )
      drawings.forEach((d, i) => { drawingMeasurements[d.id] = dmResults[i] })

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
      <div className="flex items-center justify-center h-[calc(100vh-140px)] bg-[#0a0b0f]">
        <div className="flex flex-col items-center gap-5">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-[var(--color-amber)]/20" />
            <div className="absolute inset-0 rounded-full border-2 border-t-[var(--color-amber)] border-transparent animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[var(--color-text)]">Loading Workspace</p>
            <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--color-text-muted)] mt-1">Fetching project data…</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)] bg-[#0a0b0f]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <p className="text-sm text-red-400 max-w-xs">{error ?? 'Unknown error'}</p>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[var(--color-amber)] text-[var(--color-on-amber)] rounded-lg hover:opacity-90 transition-opacity"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <WorkspaceProvider data={data}>
      <WorkspaceInner projectId={projectId} projectName={projectName} />
    </WorkspaceProvider>
  )
}
