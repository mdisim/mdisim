'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  AlertCircle, Check, Link2, MousePointer,
} from 'lucide-react'
import { DrawingFile, DrawingCalibration, DrawingMeasurement, BOQItem, Point } from '@/lib/types'
import { saveMeasurement, deleteMeasurement, updateMeasurement, saveCalibration, generateBOQQuantities } from '@/app/actions/takeoff'
import { TAKEOFF_TOOLS, TakeoffToolType, computeQuantity } from '@/lib/takeoff-tools'
import { ToolPanel } from './tool-panel'
import { MeasurementsList, MeasurementEntry } from './measurements-list'
import { DXFViewer } from './dxf-viewer'

// ────────────────────────────────────────────
// Geometry helpers
// ────────────────────────────────────────────
function dist(a: Point, b: Point) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}
function polylineLength(pts: Point[]) {
  let total = 0
  for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1], pts[i])
  return total
}
function polygonArea(pts: Point[]) {
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    area += pts[i].x * pts[j].y
    area -= pts[j].x * pts[i].y
  }
  return Math.abs(area / 2)
}
function pixelMeasure(toolType: TakeoffToolType, pts: Point[]): number {
  const cfg = TAKEOFF_TOOLS.find(t => t.type === toolType)
  if (!cfg) return 0
  if (cfg.drawMode === 'line') return polylineLength(pts)
  if (cfg.drawMode === 'polygon' || cfg.drawMode === 'rectangle') return polygonArea(pts)
  if (cfg.drawMode === 'point') return pts.length
  return 0
}

// ────────────────────────────────────────────
// Props
// ────────────────────────────────────────────
interface Props {
  drawing: DrawingFile & { file_type?: string }
  projectId: string
  pdfUrl: string
  initialCalibrations: DrawingCalibration[]
  initialMeasurements: DrawingMeasurement[]
  boqItems: BOQItem[]
  dxfContent?: string | null
}

// ────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────
export function TakeoffViewer({ drawing, projectId, pdfUrl, initialCalibrations, initialMeasurements, boqItems }: Props) {
  const isDxf = drawing.file_type === 'dxf'

  // PDF state
  const [pdfDoc, setPdfDoc] = useState<import('pdfjs-dist').PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [pdfLoading, setPdfLoading] = useState(!isDxf)
  const [pdfError, setPdfError] = useState<string | null>(null)

  // Tool state
  const [activeTool, setActiveTool] = useState<TakeoffToolType | null>(null)
  const [materialSpec, setMaterialSpec] = useState<Record<string, number | string>>({})

  // Measurement state
  const [measurements, setMeasurements] = useState<MeasurementEntry[]>(() =>
    initialMeasurements.map(m => ({
      id: m.id,
      toolType: (m as DrawingMeasurement & { tool_type?: string }).tool_type ?? m.measurement_type,
      label: m.label ?? '',
      quantity: m.real_value,
      unit: m.unit ?? 'm',
      color: m.color,
      boqItemId: m.boq_item_id,
      pageNumber: m.page_number,
      materialSpec: {},
    }))
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawingState, setDrawingState] = useState<Point[]>([])
  const [mousePos, setMousePos] = useState<Point | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  // Calibration state
  const [calibrations, setCalibrations] = useState<Record<number, DrawingCalibration>>(
    Object.fromEntries(initialCalibrations.map(c => [c.page_number, c]))
  )
  const [calibPoints, setCalibPoints] = useState<Point[]>([])
  const [calibInput, setCalibInput] = useState('')
  const [calibUnit, setCalibUnit] = useState('m')
  const [showCalibDialog, setShowCalibDialog] = useState(false)
  const [pendingCalibPx, setPendingCalibPx] = useState(0)

  // Toast
  const [toast, setToast] = useState<string | null>(null)
  const [boqResult, setBoqResult] = useState<string | null>(null)
  const [generatingBOQ, setGeneratingBOQ] = useState(false)

  // Refs
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)

  const calib = calibrations[currentPage]
  const scaleFactor = calib?.scale_factor ?? null

  // ── Load PDF ──
  useEffect(() => {
    if (isDxf) return
    let cancelled = false
    ;(async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`
        const doc = await pdfjsLib.getDocument({ url: pdfUrl }).promise
        if (!cancelled) { setPdfDoc(doc); setPdfLoading(false) }
      } catch (err) {
        if (!cancelled) {
          setPdfError(err instanceof Error ? err.message : 'Failed to load PDF')
          setPdfLoading(false)
        }
      }
    })()
    return () => { cancelled = true }
  }, [pdfUrl, isDxf])

  // ── Render PDF page ──
  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current) return
    let cancelled = false
    ;(async () => {
      const page = await pdfDoc.getPage(currentPage)
      if (cancelled) return
      const viewport = page.getViewport({ scale: zoom })
      const canvas = pdfCanvasRef.current!
      canvas.width = viewport.width
      canvas.height = viewport.height
      if (overlayRef.current) {
        overlayRef.current.width = viewport.width
        overlayRef.current.height = viewport.height
      }
      const ctx = canvas.getContext('2d')!
      await page.render({ canvasContext: ctx, viewport, canvas: canvas }).promise
    })()
    return () => { cancelled = true }
  }, [pdfDoc, currentPage, zoom])



  function drawMeasurementOnCanvas(
    ctx: CanvasRenderingContext2D,
    toolType: string,
    color: string,
    pts: Point[],
    selected: boolean,
    preview = false
  ) {
    if (!pts.length) return
    ctx.save()
    const cfg = TAKEOFF_TOOLS.find(t => t.type === toolType)
    const isPolygon = cfg?.drawMode === 'polygon' || cfg?.drawMode === 'rectangle'
    const isPoint = cfg?.drawMode === 'point'

    if (isPoint) {
      for (const pt of pts) {
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, selected ? 8 : 6, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
      }
      if (pts.length > 0) {
        ctx.fillStyle = '#1e293b'
        ctx.font = 'bold 11px system-ui'
        ctx.fillText(`×${pts.length}`, pts[0].x + 10, pts[0].y - 8)
      }
    } else {
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      if (isPolygon) {
        ctx.closePath()
        ctx.fillStyle = color + '22'
        ctx.fill()
      }
      ctx.strokeStyle = selected ? '#f59e0b' : color
      ctx.lineWidth = selected ? 3 : 2
      ctx.setLineDash(preview ? [5, 5] : [])
      ctx.stroke()
      ctx.setLineDash([])
    }

    if (selected && pts.length > 0) {
      for (const pt of pts) {
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#f59e0b'
        ctx.fill()
      }
    }
    ctx.restore()
  }

  // Measurements need a `points` field — but MeasurementEntry doesn't include it.
  // We maintain a separate ref for points so canvas rendering works.
  const pointsRef = useRef<Map<string, Point[]>>(new Map(
    initialMeasurements.map(m => [m.id, m.points])
  ))

  // Override drawMeasurementOnCanvas call to get actual points from ref
  useEffect(() => {
    const canvas = overlayRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const pageMeasurements = measurements.filter(m => m.pageNumber === currentPage)
    for (const m of pageMeasurements) {
      const pts = pointsRef.current.get(m.id) ?? []
      drawMeasurementOnCanvas(ctx, m.toolType, m.color, pts, m.id === selectedId)
    }
    if (drawingState.length > 0 && mousePos && activeTool) {
      const cfg = TAKEOFF_TOOLS.find(t => t.type === activeTool)
      drawMeasurementOnCanvas(ctx, activeTool, cfg?.color ?? '#f59e0b', [...drawingState, mousePos], false, true)
    }
    if (calibPoints.length > 0 && mousePos) {
      drawMeasurementOnCanvas(ctx, 'calibrate', '#8b5cf6', [...calibPoints, mousePos], false, true)
    }
  }, [measurements, drawingState, mousePos, selectedId, currentPage, activeTool, calibPoints])

  // ── Canvas helpers ──
  function canvasPoint(e: React.MouseEvent<HTMLCanvasElement>): Point {
    const rect = overlayRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setMousePos(canvasPoint(e))
  }, [])
  const handleMouseLeave = useCallback(() => setMousePos(null), [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  async function finalizeMeasurement(toolType: TakeoffToolType, pts: Point[]) {
    const cfg = TAKEOFF_TOOLS.find(t => t.type === toolType)!
    const pxMeasure = pixelMeasure(toolType, pts)
    let quantity: number | null = null
    let unit = cfg.unit
    if (scaleFactor) {
      const result = computeQuantity(toolType, pxMeasure, { pixelsPerMeter: scaleFactor }, materialSpec)
      quantity = result.quantity
      unit = result.unit
    }

    const localId = crypto.randomUUID()
    const entry: MeasurementEntry = {
      id: localId,
      toolType,
      label: '',
      quantity,
      unit,
      color: cfg.color,
      boqItemId: null,
      pageNumber: currentPage,
      materialSpec: { ...materialSpec },
    }
    pointsRef.current.set(localId, pts)
    setMeasurements(prev => [...prev, entry])
    setSavingId(localId)

    if (quantity !== null) {
      const matDesc = Object.entries(materialSpec).map(([k, v]) => `${k}:${v}`).join(' ')
      showToast(`${cfg.label}: ${quantity.toFixed(3)} ${unit}${matDesc ? ' @ ' + matDesc : ''}`)
    }

    const result = await saveMeasurement({
      drawing_id: drawing.id,
      page_number: currentPage,
      label: null,
      measurement_type: toolType,
      points: pts,
      color: cfg.color,
      real_value: quantity,
      unit,
    })
    setSavingId(null)
    if (result.measurement) {
      pointsRef.current.delete(localId)
      pointsRef.current.set(result.measurement.id, pts)
      setMeasurements(prev =>
        prev.map(m => m.id === localId ? { ...entry, id: result.measurement.id } : m)
      )
      setSelectedId(result.measurement.id)
    }
  }

  const handleClick = useCallback(async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = canvasPoint(e)
    if (!activeTool) return

    if (activeTool === 'calibrate') {
      const next = [...calibPoints, pt]
      setCalibPoints(next)
      if (next.length === 2) {
        setPendingCalibPx(dist(next[0], next[1]))
        setShowCalibDialog(true)
        setCalibPoints([])
        setDrawingState([])
      } else {
        setDrawingState(next)
      }
      return
    }

    const cfg = TAKEOFF_TOOLS.find(t => t.type === activeTool)
    if (!cfg) return

    if (cfg.drawMode === 'point') {
      // count: each click adds, double-click saves
      if (e.detail === 2 && drawingState.length > 0) {
        await finalizeMeasurement(activeTool, drawingState)
        setDrawingState([])
        return
      }
      setDrawingState(prev => [...prev, pt])
      return
    }

    if (cfg.drawMode === 'line' || cfg.drawMode === 'polygon') {
      if (e.detail === 2 && drawingState.length >= 1) {
        await finalizeMeasurement(activeTool, drawingState)
        setDrawingState([])
        return
      }
      setDrawingState(prev => [...prev, pt])
      return
    }
  }, [activeTool, calibPoints, drawingState, materialSpec, currentPage, scaleFactor])

  async function handleSaveCalibration() {
    const real = parseFloat(calibInput)
    if (!real || real <= 0) return
    const factor = pendingCalibPx / real
    const newCalib: DrawingCalibration = {
      id: crypto.randomUUID(),
      drawing_id: drawing.id,
      page_number: currentPage,
      pixels_distance: pendingCalibPx,
      real_distance: real,
      real_unit: calibUnit,
      scale_factor: factor,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setCalibrations(prev => ({ ...prev, [currentPage]: newCalib }))
    await saveCalibration(drawing.id, currentPage, {
      pixels_distance: pendingCalibPx,
      real_distance: real,
      real_unit: calibUnit,
      scale_factor: factor,
    })
    setShowCalibDialog(false)
    setCalibInput('')
    setActiveTool(null)
  }

  async function handleDeleteMeasurement(id: string) {
    pointsRef.current.delete(id)
    setMeasurements(prev => prev.filter(m => m.id !== id))
    if (selectedId === id) setSelectedId(null)
    await deleteMeasurement(id)
  }

  async function handleLinkBOQ(measurementId: string, boqItemId: string) {
    setMeasurements(prev =>
      prev.map(m => m.id === measurementId ? { ...m, boqItemId: boqItemId || null } : m)
    )
    await updateMeasurement(measurementId, { boq_item_id: boqItemId || null })
  }

  async function handleGenerateBOQ() {
    setGeneratingBOQ(true)
    setBoqResult(null)
    const result = await generateBOQQuantities(drawing.id, projectId)
    setGeneratingBOQ(false)
    setBoqResult(result.error ? `Error: ${result.error}` : `Updated ${result.updated} BOQ item${result.updated !== 1 ? 's' : ''}`)
  }

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape') { setDrawingState([]); setActiveTool(null); setCalibPoints([]) }
      if (e.key === 'Delete' && selectedId) handleDeleteMeasurement(selectedId)
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.25, 4))
      if (e.key === '-') setZoom(z => Math.max(z - 0.25, 0.25))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId])

  function handleSelectTool(type: TakeoffToolType) {
    setActiveTool(type)
    setDrawingState([])
    // Init material spec defaults
    const cfg = TAKEOFF_TOOLS.find(t => t.type === type)
    if (cfg?.materialInputs) {
      const defaults: Record<string, number | string> = {}
      for (const inp of cfg.materialInputs) defaults[inp.key] = inp.defaultValue
      setMaterialSpec(defaults)
    } else {
      setMaterialSpec({})
    }
  }

  const cursorStyle = activeTool ? 'crosshair' : 'default'

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden -m-4 md:-m-6">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <Link href={`/projects/${projectId}/takeoff`} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={15} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{drawing.name}</p>
          <p className="text-slate-500 text-xs">{drawing.original_filename}</p>
        </div>

        <div className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${calib ? 'bg-green-900/50 text-green-400' : 'bg-amber-900/50 text-amber-400'}`}>
          {calib ? <Check size={11} /> : <AlertCircle size={11} />}
          {calib ? `1 ${calib.real_unit} = ${calib.pixels_distance.toFixed(0)}px` : 'Not calibrated'}
        </div>

        <button
          onClick={handleGenerateBOQ}
          disabled={generatingBOQ}
          className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <Link2 size={12} />
          {generatingBOQ ? 'Generating…' : 'Push to BOQ'}
        </button>

        {boqResult && <span className="text-xs text-green-400 hidden sm:block">{boqResult}</span>}

        {!isDxf && drawing.page_count > 1 && (
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-40"><ChevronLeft size={14} /></button>
            <span className="text-xs">{currentPage}/{drawing.page_count}</span>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, drawing.page_count))} disabled={currentPage === drawing.page_count}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-40"><ChevronRight size={14} /></button>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"><ZoomOut size={14} /></button>
          <span className="text-xs text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(z + 0.25, 4))} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"><ZoomIn size={14} /></button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left tool panel */}
        <ToolPanel
          activeTool={activeTool}
          materialSpec={materialSpec}
          onSelectTool={handleSelectTool}
          onMaterialSpecChange={(key, value) => setMaterialSpec(prev => ({ ...prev, [key]: value }))}
        />

        {/* Canvas area */}
        <div className="flex-1 overflow-auto bg-slate-800">
          {isDxf ? (
            <div className="flex items-center justify-center h-full">
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 max-w-sm text-center">
                <AlertCircle size={32} className="text-amber-400 mx-auto mb-3" />
                <p className="text-white font-semibold mb-2">DXF File</p>
                <p className="text-slate-400 text-sm">DXF viewing is coming soon. You can still add measurements manually using the tools on the left.</p>
              </div>
            </div>
          ) : (
            <>
              {pdfLoading && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-slate-400">
                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm">Loading PDF…</p>
                  </div>
                </div>
              )}
              {pdfError && (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-red-900/30 border border-red-800 rounded-xl p-6 max-w-sm text-center">
                    <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
                    <p className="text-red-300 font-medium mb-1">Failed to load PDF</p>
                    <p className="text-red-400 text-sm">{pdfError}</p>
                  </div>
                </div>
              )}
              {!pdfLoading && !pdfError && (
                <div className="inline-block m-4 relative shadow-2xl">
                  <canvas ref={pdfCanvasRef} className="block bg-white" style={{ imageRendering: 'crisp-edges' }} />
                  <canvas
                    ref={overlayRef}
                    className="absolute inset-0 block"
                    style={{ cursor: cursorStyle }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onClick={handleClick}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Right measurements panel */}
        <div className="w-60 shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden">
          <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Measurements</p>
            <button
              title="Select tool"
              onClick={() => setActiveTool(null)}
              className={`p-1.5 rounded transition-colors ${activeTool === null ? 'bg-amber-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <MousePointer size={13} />
            </button>
          </div>
          <MeasurementsList
            measurements={measurements}
            selectedId={selectedId}
            boqItems={boqItems}
            savingId={savingId}
            currentPage={currentPage}
            onSelect={id => setSelectedId(id === selectedId ? null : id)}
            onDelete={handleDeleteMeasurement}
            onLinkBOQ={handleLinkBOQ}
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-4 py-1.5 bg-slate-900 border-t border-slate-800 text-xs text-slate-500 shrink-0">
        <span>Tool: <span className="text-slate-300">{activeTool ?? 'none'}</span></span>
        {drawingState.length > 0 && (
          <span className="text-amber-400">
            {drawingState.length} point{drawingState.length !== 1 ? 's' : ''} — double-click to finish
          </span>
        )}
        {mousePos && <span>x:{Math.round(mousePos.x)} y:{Math.round(mousePos.y)}</span>}
        <span className="ml-auto">Esc=cancel Del=delete ±=zoom</span>
      </div>

      {/* Calibration dialog */}
      {showCalibDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowCalibDialog(false)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-semibold mb-1">Set Scale</h3>
            <p className="text-slate-400 text-sm mb-4">
              Line drawn: <strong className="text-white">{Math.round(pendingCalibPx)} px</strong> — enter the real-world distance this represents.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="number"
                value={calibInput}
                onChange={e => setCalibInput(e.target.value)}
                autoFocus
                placeholder="e.g. 5"
                className="flex-1 bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              />
              <select
                value={calibUnit}
                onChange={e => setCalibUnit(e.target.value)}
                className="bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              >
                {['mm', 'cm', 'm', 'ft', 'in'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveCalibration}
                disabled={!calibInput || parseFloat(calibInput) <= 0}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-semibold rounded-lg py-2 text-sm transition-colors"
              >
                Set Scale
              </button>
              <button onClick={() => setShowCalibDialog(false)} className="px-4 border border-slate-700 text-slate-400 rounded-lg text-sm hover:bg-slate-800">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-700 text-white text-sm px-4 py-2.5 rounded-xl shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
