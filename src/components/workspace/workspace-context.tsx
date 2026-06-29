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
  linkedSourceDrawings: Drawing[]
  linkedQuantityChanges: QuantityChange[]
  linkedVariations: Variation[]
  linkedPayments: { certs: PaymentCert[]; totalCertified: number; contractAmount: number }
  linkedCostEntries: CostEntry[]
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

  const linkedSourceDrawings = useMemo(() => {
    if (!selection.boqItem) return []
    const drawingIds = new Set<string>()
    for (const m of linkedMeasurements) {
      if (m.lines) {
        for (const line of m.lines) {
          if (line.drawing_id) drawingIds.add(line.drawing_id)
        }
      }
      if (m.drawing_ref) {
        const match = data.drawings.find(d => d.drawing_number === m.drawing_ref)
        if (match) drawingIds.add(match.id)
      }
    }
    return data.drawings.filter(d => drawingIds.has(d.id))
  }, [selection.boqItem, linkedMeasurements, data.drawings])

  const linkedQuantityChanges = useMemo(() => {
    if (!selection.boqItem) return []
    return data.quantityChanges.filter(qc =>
      qc.boq_item_id === selection.boqItem!.id ||
      (selection.boqItem!.mi_id && qc.mi_id === selection.boqItem!.mi_id)
    )
  }, [selection.boqItem, data.quantityChanges])

  const linkedVariations = useMemo(() => {
    if (!selection.boqItem) return []
    return data.variations.filter(v =>
      v.items?.some(vi => vi.boq_item_id === selection.boqItem!.id)
    )
  }, [selection.boqItem, data.variations])

  const linkedPayments = useMemo(() => {
    if (!selection.boqItem) return { certs: [] as PaymentCert[], totalCertified: 0, contractAmount: 0 }
    const certs = data.payments.filter(cert =>
      cert.lines?.some(line => line.boq_item_id === selection.boqItem!.id)
    )
    let totalCertified = 0
    let contractAmount = 0
    if (certs.length > 0) {
      const latest = certs.reduce((a, b) => a.cert_number > b.cert_number ? a : b)
      const lines = latest.lines?.filter(line => line.boq_item_id === selection.boqItem!.id) ?? []
      totalCertified = lines.reduce((sum, line) => sum + line.cumulative_amount, 0)
      contractAmount = lines.reduce((sum, line) => sum + line.contract_amount, 0)
    }
    return { certs, totalCertified, contractAmount }
  }, [selection.boqItem, data.payments])

  const linkedCostEntries = useMemo(() => {
    if (!selection.boqItem) return []
    return data.costEntries.filter(ce => ce.boq_item_id === selection.boqItem!.id)
  }, [selection.boqItem, data.costEntries])

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
      linkedSourceDrawings, linkedQuantityChanges, linkedVariations, linkedPayments, linkedCostEntries,
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
