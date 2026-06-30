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
  LayoutPanelLeft, PanelLeftClose, PanelRightClose,
  AlertTriangle, RefreshCw, Box, Monitor, SplitSquareHorizontal,
  Image as ImageIcon,
} from 'lucide-react'

function ViewModeToggle() {
  const { viewMode, setViewMode } = useWorkspace()
  return (
    <div className="flex items-center bg-slate-100 dark:bg-white/[0.04] rounded-lg p-0.5">
      {[
        { mode: '2d' as const, icon: ImageIcon, label: '2D' },
        { mode: '3d' as const, icon: Box, label: '3D' },
        { mode: 'split' as const, icon: SplitSquareHorizontal, label: 'Split' },
      ].map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          className={cn(
            'flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md transition-all',
            viewMode === mode
              ? 'bg-white dark:bg-white/[0.08] text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          )}
        >
          <Icon size={11} />
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
    <div className="flex flex-col h-[calc(100vh-140px)] bg-[#f8f9fa] dark:bg-[#0a0b0f] overflow-hidden">
      {/* Workspace Header */}
      <div className="flex items-center justify-between px-3 h-9 bg-white dark:bg-[#0f1117] border-b border-slate-200/60 dark:border-white/[0.04] shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
            <LayoutPanelLeft size={12} />
          </div>
          <h2 className="text-[12px] font-bold text-slate-900 dark:text-white">Workspace</h2>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[160px]">{projectName}</span>
        </div>

        <div className="flex items-center gap-2">
          <ViewModeToggle />
          <div className="w-px h-4 bg-slate-200 dark:bg-white/[0.06]" />
          <button
            onClick={() => setLeftVisible(!leftVisible)}
            className={cn(
              'p-1 rounded-md transition-colors',
              leftVisible ? 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]' : 'text-blue-500 bg-blue-50 dark:bg-blue-500/10'
            )}
            title="Toggle explorer (⌘[)"
          >
            <PanelLeftClose size={13} />
          </button>
          <button
            onClick={() => setRightVisible(!rightVisible)}
            className={cn(
              'p-1 rounded-md transition-colors',
              rightVisible ? 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]' : 'text-blue-500 bg-blue-50 dark:bg-blue-500/10'
            )}
            title="Toggle properties (⌘])"
          >
            <PanelRightClose size={13} />
          </button>
          <div className="hidden lg:flex items-center gap-0.5 text-[8px] text-slate-400">
            <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-white/[0.04] rounded border border-slate-200 dark:border-white/[0.06]">⌘[</kbd>
            <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-white/[0.04] rounded border border-slate-200 dark:border-white/[0.06]">⌘]</kbd>
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
                leftResize.isResizing ? 'bg-blue-500/20' : 'hover:bg-blue-500/10'
              )}
            >
              <div className={cn(
                'absolute inset-y-0 left-0 w-px',
                leftResize.isResizing ? 'bg-blue-500' : 'bg-slate-200 dark:bg-white/[0.04] group-hover:bg-blue-400'
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
                <div className="flex-1 overflow-hidden border-r border-slate-200 dark:border-white/[0.04]">
                  <WorkspaceDrawingViewer />
                </div>
                <div className="flex-1 overflow-hidden">
                  <BimViewer />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Dock */}
          <div
            onMouseDown={bottomResize.handleMouseDown}
            className={cn(
              'h-1 shrink-0 cursor-row-resize group relative',
              bottomResize.isResizing ? 'bg-blue-500/20' : 'hover:bg-blue-500/10'
            )}
          >
            <div className={cn(
              'absolute inset-x-0 top-0 h-px',
              bottomResize.isResizing ? 'bg-blue-500' : 'bg-slate-200 dark:bg-white/[0.04] group-hover:bg-blue-400'
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
              className="w-1 shrink-0 cursor-col-resize group relative hover:bg-blue-500/10"
            >
              <div className="absolute inset-y-0 right-0 w-px bg-slate-200 dark:bg-white/[0.04] group-hover:bg-blue-400" />
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
      <div className="flex items-center justify-center h-[calc(100vh-140px)] bg-[#f8f9fa] dark:bg-[#0a0b0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-indigo-500/30 dark:border-indigo-400/30 rounded-full" />
            <div className="absolute inset-0 w-12 h-12 border-2 border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Loading Workspace</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Fetching project data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)] bg-[#f8f9fa] dark:bg-[#0a0b0f]">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertTriangle size={32} className="text-red-400" />
          <p className="text-sm text-red-500">{error ?? 'Unknown error'}</p>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCw size={12} />Retry
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
