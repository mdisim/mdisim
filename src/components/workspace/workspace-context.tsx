'use client'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import type {
  BOQItem, Drawing, MeasurementItem, LibraryCategory, LibraryItem,
  Contract, CostEntry, Variation, DrawingRevision, RateAnalysis,
  PaymentCert, DrawingMeasurement, QuantityChange,
} from '@/lib/types'

export type SelectionType = 'boq' | 'drawing' | 'measurement' | 'library-item' | 'revision' | null

export interface WorkspaceData {
  boqItems: BOQItem[]
  drawings: Drawing[]
  measurementItems: MeasurementItem[]
  categories: LibraryCategory[]
  libraryItems: LibraryItem[]
  contract: Contract | null
  costEntries: CostEntry[]
  variations: Variation[]
  revisions: Record<string, DrawingRevision[]>
  rateAnalyses: RateAnalysis[]
  payments: PaymentCert[]
  drawingMeasurements: Record<string, DrawingMeasurement[]>
  quantityChanges: QuantityChange[]
}

export interface WorkspaceSelection {
  type: SelectionType
  boqItem: BOQItem | null
  drawing: Drawing | null
  measurement: MeasurementItem | null
  libraryItem: LibraryItem | null
}

interface WorkspaceContextType {
  data: WorkspaceData
  selection: WorkspaceSelection
  selectBoqItem: (item: BOQItem | null) => void
  selectDrawing: (drawing: Drawing | null) => void
  selectMeasurement: (item: MeasurementItem | null) => void
  selectLibraryItem: (item: LibraryItem | null) => void
  linkedMeasurements: MeasurementItem[]
  linkedBoqItems: BOQItem[]
  linkedRevisions: DrawingRevision[]
  linkedRateAnalysis: RateAnalysis | null
  linkedDrawingMeasurements: DrawingMeasurement[]
  fmt: (n: number) => string
  fmtCompact: (n: number) => string
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function WorkspaceProvider({ data, children }: { data: WorkspaceData; children: ReactNode }) {
  const [selection, setSelection] = useState<WorkspaceSelection>({
    type: null, boqItem: null, drawing: null, measurement: null, libraryItem: null,
  })

  const selectBoqItem = useCallback((item: BOQItem | null) => {
    setSelection(prev => ({ ...prev, type: item ? 'boq' : null, boqItem: item }))
  }, [])

  const selectDrawing = useCallback((drawing: Drawing | null) => {
    setSelection(prev => ({ ...prev, type: drawing ? 'drawing' : null, drawing }))
  }, [])

  const selectMeasurement = useCallback((item: MeasurementItem | null) => {
    setSelection(prev => ({ ...prev, type: item ? 'measurement' : null, measurement: item }))
  }, [])

  const selectLibraryItem = useCallback((item: LibraryItem | null) => {
    setSelection(prev => ({ ...prev, type: item ? 'library-item' : null, libraryItem: item }))
  }, [])

  const linkedMeasurements = useMemo(() => {
    if (!selection.boqItem) return []
    return data.measurementItems.filter(m =>
      m.item_code === selection.boqItem!.code ||
      (selection.boqItem!.mi_id && m.id === selection.boqItem!.mi_id)
    )
  }, [selection.boqItem, data.measurementItems])

  const linkedBoqItems = useMemo(() => {
    if (selection.drawing) {
      return data.boqItems.filter(b => {
        const drawingMeasurements = data.drawingMeasurements[selection.drawing!.id] ?? []
        return drawingMeasurements.some(dm =>
          dm.label?.includes(b.description) || dm.label?.includes(b.code ?? '')
        )
      })
    }
    if (selection.measurement) {
      return data.boqItems.filter(b =>
        b.mi_id === selection.measurement!.id ||
        b.code === selection.measurement!.item_code
      )
    }
    return []
  }, [selection.drawing, selection.measurement, data.boqItems, data.drawingMeasurements])

  const linkedRevisions = useMemo(() => {
    if (!selection.drawing) return []
    return data.revisions[selection.drawing.id] ?? []
  }, [selection.drawing, data.revisions])

  const linkedRateAnalysis = useMemo(() => {
    if (!selection.boqItem) return null
    return data.rateAnalyses.find(r => r.boq_item_id === selection.boqItem!.id) ?? null
  }, [selection.boqItem, data.rateAnalyses])

  const linkedDrawingMeasurements = useMemo(() => {
    if (!selection.drawing) return []
    return data.drawingMeasurements[selection.drawing.id] ?? []
  }, [selection.drawing, data.drawingMeasurements])

  const fmt = useCallback((n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [])

  const fmtCompact = useCallback((n: number) => {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toFixed(2)
  }, [])

  return (
    <WorkspaceContext.Provider value={{
      data, selection,
      selectBoqItem, selectDrawing, selectMeasurement, selectLibraryItem,
      linkedMeasurements, linkedBoqItems, linkedRevisions, linkedRateAnalysis, linkedDrawingMeasurements,
      fmt, fmtCompact,
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
