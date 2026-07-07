'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'

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

import { WorkspaceProvider, type WorkspaceData } from '@/components/workspace/workspace-context'
import { WorkspaceShell } from '@/components/workspace/workspace-shell'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, RefreshCw } from 'lucide-react'

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
