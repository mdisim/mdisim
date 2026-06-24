'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { DrawingScale, DrawingMeasurement, DrawingToolType } from '@/lib/types'
import type { Point } from '@/lib/takeoff/geometry'
import {
  distance,
  polylineLength,
  polygonArea,
  rectangleArea,
  circleArea,
  pixelsToReal,
  sqPixelsToReal,
} from '@/lib/takeoff/geometry'
import { renderMeasurements, renderActiveDrawing, renderCalibrationLine, type TakeoffMeasurement } from '@/lib/takeoff/renderer'
import { TakeoffToolbar } from './takeoff-toolbar'
import { MeasurementList } from './measurement-list'
import { CalibrationDialog } from './calibration-dialog'
import {
  getDrawingScales,
  createDrawingScale,
  getDrawingMeasurements,
  createDrawingMeasurement,
  updateDrawingMeasurement,
  deleteDrawingMeasurement,
} from '@/app/actions/drawings'
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  AlertTriangle,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'

interface TakeoffViewerProps {
  drawingId: string
  drawingUrl: string
  pageCount: number
}

type ToolMode = DrawingToolType | 'select' | 'pan' | null

export function TakeoffViewer({ drawingId, drawingUrl, pageCount }: TakeoffViewerProps) {
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [pdfDoc, setPdfDoc] = useState<unknown>(null)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1.0)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [loading, setLoading] = useState(true)

  const [activeTool, setActiveTool] = useState<ToolMode>('select')
  const [activePoints, setActivePoints] = useState<Point[]>([])
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([])
  const [showCalibrationDialog, setShowCalibrationDialog] = useState(false)
  const [calibrationPixelDist, setCalibrationPixelDist] = useState(0)

  const [currentScale, setCurrentScale] = useState<DrawingScale | null>(null)
  const [measurements, setMeasurements] = useState<DrawingMeasurement[]>([])
  const [activeMeasurementId, setActiveMeasurementId] = useState<string | null>(null)
  const [activeColor, setActiveColor] = useState('#3B82F6')
  const [showPanel, setShowPanel] = useState(true)
  const [undoStack, setUndoStack] = useState<string[]>([])

  const isPanning = useRef(false)
  const panStart = useRef<Point>({ x: 0, y: 0 })
  const offsetStart = useRef<Point>({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef<Point>({ x: 0, y: 0 })

  // Load PDF
  useEffect(() => {
    let cancelled = false
    async function loadPdf() {
      try {
        setLoading(true)
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        const doc = await pdfjsLib.getDocument({ url: drawingUrl }).promise
        if (!cancelled) {
          setPdfDoc(doc)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    loadPdf()
    return () => { cancelled = true }
  }, [drawingUrl])

  // Load scale + measurements when page changes
  const loadPageData = useCallback(async () => {
    const [scales, meas] = await Promise.all([
      getDrawingScales(drawingId),
      getDrawingMeasurements(drawingId, page),
    ])
    const pageScale = scales.find((s) => s.page_number === page) ?? null
    setCurrentScale(pageScale)
    setMeasurements(meas)
  }, [drawingId, page])

  useEffect(() => { loadPageData() }, [loadPageData])

  // Render PDF to canvas
  const renderPdf = useCallback(async () => {
    if (!pdfDoc || !pdfCanvasRef.current) return
    const doc = pdfDoc as { getPage: (n: number) => Promise<{ getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> } }> }
    const pg = await doc.getPage(page)
    const viewport = pg.getViewport({ scale: zoom })
    const canvas = pdfCanvasRef.current
    canvas.width = viewport.width
    canvas.height = viewport.height
    setCanvasSize({ width: viewport.width, height: viewport.height })
    const ctx = canvas.getContext('2d')!
    await pg.render({ canvasContext: ctx, viewport }).promise
  }, [pdfDoc, page, zoom])

  useEffect(() => { renderPdf() }, [renderPdf])

  // Render overlay
  const renderOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    canvas.width = canvasSize.width
    canvas.height = canvasSize.height
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const takeoffMeasurements: TakeoffMeasurement[] = measurements.map((m) => ({
      id: m.id,
      tool_type: m.tool_type,
      coordinates: m.coordinates,
      quantity: m.quantity,
      unit: m.unit,
      color: m.color,
      label: m.label,
    }))

    renderMeasurements(ctx, takeoffMeasurements, zoom, activeMeasurementId ?? undefined)

    if (isCalibrating && calibrationPoints.length > 0) {
      renderCalibrationLine(ctx, calibrationPoints, zoom)
    }

    if (!isCalibrating && activePoints.length > 0 && activeTool && activeTool !== 'select' && activeTool !== 'pan') {
      renderActiveDrawing(ctx, activeTool as DrawingToolType, activePoints, zoom, activeColor)
    }
  }, [canvasSize, measurements, activeMeasurementId, isCalibrating, calibrationPoints, activePoints, activeTool, activeColor, zoom])

  useEffect(() => {
    const frame = requestAnimationFrame(renderOverlay)
    return () => cancelAnimationFrame(frame)
  }, [renderOverlay])

  // Convert screen coords to canvas (PDF) coords
  const screenToCanvas = useCallback((clientX: number, clientY: number): Point => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (clientX - rect.left),
      y: (clientY - rect.top),
    }
  }, [])

  // Calculate quantity from points
  const calculateQuantity = useCallback((tool: DrawingToolType, points: Point[]): { quantity: number; unit: string } => {
    const pxPerUnit = currentScale?.px_per_unit ?? 0
    const scaleUnit = currentScale?.unit ?? 'px'
    const hasScale = pxPerUnit > 0

    switch (tool) {
      case 'line': {
        if (points.length < 2) return { quantity: 0, unit: hasScale ? scaleUnit : 'px' }
        const px = distance(points[0], points[1])
        return { quantity: hasScale ? pixelsToReal(px, pxPerUnit) : px, unit: hasScale ? scaleUnit : 'px' }
      }
      case 'polyline': {
        const px = polylineLength(points)
        return { quantity: hasScale ? pixelsToReal(px, pxPerUnit) : px, unit: hasScale ? scaleUnit : 'px' }
      }
      case 'area': {
        const px = polygonArea(points)
        const areaUnit = hasScale ? `${scaleUnit}²` : 'px²'
        return { quantity: hasScale ? sqPixelsToReal(px, pxPerUnit) : px, unit: areaUnit }
      }
      case 'rectangle': {
        if (points.length < 2) return { quantity: 0, unit: hasScale ? `${scaleUnit}²` : 'px²' }
        const w = Math.abs(points[1].x - points[0].x)
        const h = Math.abs(points[1].y - points[0].y)
        const px = rectangleArea({ x: 0, y: 0 }, w, h)
        const areaUnit = hasScale ? `${scaleUnit}²` : 'px²'
        return { quantity: hasScale ? sqPixelsToReal(px, pxPerUnit) : px, unit: areaUnit }
      }
      case 'circle': {
        if (points.length < 2) return { quantity: 0, unit: hasScale ? `${scaleUnit}²` : 'px²' }
        const r = distance(points[0], points[1])
        const px = circleArea(r)
        const areaUnit = hasScale ? `${scaleUnit}²` : 'px²'
        return { quantity: hasScale ? sqPixelsToReal(px, pxPerUnit) : px, unit: areaUnit }
      }
      case 'count':
        return { quantity: points.length, unit: 'nr' }
      default:
        return { quantity: 0, unit: 'px' }
    }
  }, [currentScale])

  // Build coordinates JSONB
  const buildCoordinates = (tool: DrawingToolType, points: Point[]): unknown => {
    const pts = points.map((p) => [p.x, p.y])
    switch (tool) {
      case 'line':
      case 'polyline':
      case 'area':
      case 'count':
        return { points: pts }
      case 'rectangle':
        if (points.length < 2) return { origin: [0, 0], width: 0, height: 0 }
        return {
          origin: [Math.min(points[0].x, points[1].x), Math.min(points[0].y, points[1].y)],
          width: Math.abs(points[1].x - points[0].x),
          height: Math.abs(points[1].y - points[0].y),
        }
      case 'circle':
        if (points.length < 2) return { center: [0, 0], radius: 0 }
        return {
          center: [points[0].x, points[0].y],
          radius: distance(points[0], points[1]),
        }
      default:
        return { points: pts }
    }
  }

  // Save measurement
  const saveMeasurement = useCallback(async (tool: DrawingToolType, points: Point[]) => {
    const { quantity, unit } = calculateQuantity(tool, points)
    const coordinates = buildCoordinates(tool, points)

    const result = await createDrawingMeasurement({
      drawing_id: drawingId,
      page_number: page,
      scale_id: currentScale?.id,
      tool_type: tool,
      coordinates,
      quantity: Math.round(quantity * 10000) / 10000,
      unit,
      color: activeColor,
    })

    if (result.data) {
      setMeasurements((prev) => [...prev, result.data!])
      setUndoStack((prev) => [...prev, result.data!.id])
      setActiveMeasurementId(result.data.id)
    }
  }, [drawingId, page, currentScale, activeColor, calculateQuantity])

  // Complete measurement
  const completeMeasurement = useCallback(async () => {
    if (!activeTool || activeTool === 'select' || activeTool === 'pan') return
    if (activePoints.length < 1) return

    const tool = activeTool as DrawingToolType
    const minPoints: Record<string, number> = { line: 2, polyline: 2, area: 3, rectangle: 2, circle: 2, count: 1 }
    if (activePoints.length < (minPoints[tool] ?? 1)) return

    await saveMeasurement(tool, activePoints)
    setActivePoints([])
  }, [activeTool, activePoints, saveMeasurement])

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && activeTool === 'pan')) {
      isPanning.current = true
      panStart.current = { x: e.clientX, y: e.clientY }
      offsetStart.current = { ...offset }
      return
    }

    if (e.button !== 0) return
    const pt = screenToCanvas(e.clientX, e.clientY)

    // Calibration mode
    if (isCalibrating) {
      if (calibrationPoints.length === 0) {
        setCalibrationPoints([pt])
      } else {
        const pts = [...calibrationPoints, pt]
        setCalibrationPoints(pts)
        const px = distance(pts[0], pts[1])
        setCalibrationPixelDist(px)
        setShowCalibrationDialog(true)
      }
      return
    }

    // Select tool — hit test
    if (activeTool === 'select') {
      const hit = hitTest(pt, measurements)
      setActiveMeasurementId(hit?.id ?? null)
      return
    }

    // Drawing tools
    if (!activeTool || activeTool === 'pan') return

    // Rectangle/circle: start drag
    if (activeTool === 'rectangle' || activeTool === 'circle') {
      isDragging.current = true
      dragStart.current = pt
      setActivePoints([pt])
      return
    }

    // Line: two clicks
    if (activeTool === 'line') {
      if (activePoints.length === 0) {
        setActivePoints([pt])
      } else {
        const pts = [...activePoints, pt]
        setActivePoints(pts)
        // Will complete on next render cycle
        setTimeout(async () => {
          await saveMeasurement('line', pts)
          setActivePoints([])
        }, 0)
      }
      return
    }

    // Count: each click is a marker
    if (activeTool === 'count') {
      const pts = [...activePoints, pt]
      setActivePoints(pts)
      return
    }

    // Polyline/area: click to add point
    setActivePoints((prev) => [...prev, pt])
  }, [activeTool, offset, isCalibrating, calibrationPoints, activePoints, screenToCanvas, measurements, saveMeasurement])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) {
      setOffset({
        x: offsetStart.current.x + (e.clientX - panStart.current.x),
        y: offsetStart.current.y + (e.clientY - panStart.current.y),
      })
      return
    }

    if (isDragging.current && (activeTool === 'rectangle' || activeTool === 'circle')) {
      const pt = screenToCanvas(e.clientX, e.clientY)
      setActivePoints([dragStart.current, pt])
    }
  }, [activeTool, screenToCanvas])

  const handleMouseUp = useCallback(async (e: React.MouseEvent) => {
    if (isPanning.current) {
      isPanning.current = false
      return
    }

    if (isDragging.current && (activeTool === 'rectangle' || activeTool === 'circle')) {
      isDragging.current = false
      if (activePoints.length >= 2) {
        const tool = activeTool as DrawingToolType
        await saveMeasurement(tool, activePoints)
        setActivePoints([])
      }
    }
  }, [activeTool, activePoints, saveMeasurement])

  const handleDoubleClick = useCallback(async () => {
    // Double-click completes polyline, area, count
    if (activeTool === 'polyline' || activeTool === 'area' || activeTool === 'count') {
      await completeMeasurement()
    }
  }, [activeTool, completeMeasurement])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom((z) => Math.max(0.25, Math.min(5, z + delta)))
  }, [])

  // Keyboard: space to pan, escape to cancel, delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePoints([])
        setIsCalibrating(false)
        setCalibrationPoints([])
        setActiveMeasurementId(null)
      }
      if (e.key === 'Delete' && activeMeasurementId) {
        handleDeleteMeasurement(activeMeasurementId)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeMeasurementId])

  // Calibration confirm
  const handleCalibrationConfirm = useCallback(async (realLength: number, unit: string) => {
    if (calibrationPoints.length < 2 || realLength <= 0) return
    const pxDist = distance(calibrationPoints[0], calibrationPoints[1])
    const pxPerUnit = pxDist / realLength

    const result = await createDrawingScale({
      drawing_id: drawingId,
      page_number: page,
      label: `Scale (${realLength} ${unit})`,
      pt1_x: calibrationPoints[0].x,
      pt1_y: calibrationPoints[0].y,
      pt2_x: calibrationPoints[1].x,
      pt2_y: calibrationPoints[1].y,
      real_length: realLength,
      unit,
      px_per_unit: pxPerUnit,
    })

    if (result.data) {
      setCurrentScale(result.data)
      // Recalculate existing measurements with new scale
      for (const m of measurements) {
        const pts = extractPoints(m)
        const { quantity, unit: mUnit } = calculateQuantityFromMeasurement(m.tool_type as DrawingToolType, pts, pxPerUnit, unit)
        await updateDrawingMeasurement(m.id, { quantity, unit: mUnit })
      }
      await loadPageData()
    }

    setShowCalibrationDialog(false)
    setIsCalibrating(false)
    setCalibrationPoints([])
  }, [calibrationPoints, drawingId, page, measurements, loadPageData])

  const handleDeleteMeasurement = useCallback(async (id: string) => {
    await deleteDrawingMeasurement(id)
    setMeasurements((prev) => prev.filter((m) => m.id !== id))
    if (activeMeasurementId === id) setActiveMeasurementId(null)
  }, [activeMeasurementId])

  const handleUndo = useCallback(async () => {
    const lastId = undoStack[undoStack.length - 1]
    if (!lastId) return
    await handleDeleteMeasurement(lastId)
    setUndoStack((prev) => prev.slice(0, -1))
  }, [undoStack, handleDeleteMeasurement])

  const handleLabelChange = useCallback(async (id: string, label: string) => {
    await updateDrawingMeasurement(id, { label })
    setMeasurements((prev) => prev.map((m) => m.id === id ? { ...m, label } : m))
  }, [])

  const handleStartCalibrate = useCallback(() => {
    setIsCalibrating(true)
    setCalibrationPoints([])
    setActivePoints([])
    setActiveTool(null)
  }, [])

  const handleToolChange = useCallback((tool: string | null) => {
    setActiveTool(tool as ToolMode)
    setActivePoints([])
    setIsCalibrating(false)
    setCalibrationPoints([])
  }, [])

  const fitToWidth = useCallback(() => {
    if (!containerRef.current || canvasSize.width === 0) return
    const containerWidth = containerRef.current.clientWidth - (showPanel ? 300 : 0)
    setZoom(containerWidth / (canvasSize.width / zoom))
    setOffset({ x: 0, y: 0 })
  }, [canvasSize, zoom, showPanel])

  const cursorStyle = () => {
    if (isPanning.current) return 'grabbing'
    if (activeTool === 'pan') return 'grab'
    if (activeTool === 'select') return 'default'
    if (isCalibrating) return 'crosshair'
    return 'crosshair'
  }

  const takeoffMeasurements: TakeoffMeasurement[] = measurements.map((m) => ({
    id: m.id,
    tool_type: m.tool_type,
    coordinates: m.coordinates,
    quantity: m.quantity,
    unit: m.unit,
    color: m.color,
    label: m.label,
  }))

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900">
      {/* Toolbar */}
      <TakeoffToolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onCalibrate={handleStartCalibrate}
        isCalibrating={isCalibrating}
        measurements={takeoffMeasurements}
        onDeleteMeasurement={handleDeleteMeasurement}
        onUndo={handleUndo}
        canUndo={undoStack.length > 0}
        activeColor={activeColor}
        onColorChange={setActiveColor}
      />

      {/* Scale warning */}
      {!currentScale && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm">
          <AlertTriangle size={14} />
          <span>No scale calibrated. Measurements show pixel values. Click <strong>Calibrate</strong> to set the drawing scale.</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden" ref={containerRef}>
        {/* Canvas area */}
        <div className="flex-1 relative overflow-hidden bg-slate-200 dark:bg-slate-800">
          {/* Page nav + zoom controls */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-md px-2 py-1.5">
            <button
              onClick={() => { setPage(Math.max(1, page - 1)); setOffset({ x: 0, y: 0 }) }}
              disabled={page <= 1}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-slate-600 dark:text-slate-300 min-w-[50px] text-center tabular-nums">
              {page} / {pageCount}
            </span>
            <button
              onClick={() => { setPage(Math.min(pageCount, page + 1)); setOffset({ x: 0, y: 0 }) }}
              disabled={page >= pageCount}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
            <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />
            <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
              <ZoomOut size={14} />
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400 min-w-[40px] text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom((z) => Math.min(5, z + 0.25))} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
              <ZoomIn size={14} />
            </button>
            <button onClick={fitToWidth} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Fit to width">
              <Maximize2 size={14} />
            </button>
          </div>

          {/* Panel toggle */}
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="absolute top-3 right-3 z-10 p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-md hover:bg-slate-100 dark:hover:bg-slate-700"
            title={showPanel ? 'Hide panel' : 'Show panel'}
          >
            {showPanel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>

          {/* Canvas stack */}
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                cursor: cursorStyle(),
              }}
              className="relative inline-block"
            >
              <canvas ref={pdfCanvasRef} className="block" />
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onDoubleClick={handleDoubleClick}
                onWheel={handleWheel}
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
          )}
        </div>

        {/* Measurement panel */}
        {showPanel && (
          <div className="w-[300px] shrink-0 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto">
            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Measurements
              </h3>
              {currentScale && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Scale: 1px = {(1 / currentScale.px_per_unit).toFixed(4)} {currentScale.unit}
                </p>
              )}
            </div>
            <MeasurementList
              measurements={takeoffMeasurements}
              activeMeasurementId={activeMeasurementId}
              onSelect={setActiveMeasurementId}
              onDelete={handleDeleteMeasurement}
              onLabelChange={handleLabelChange}
            />
          </div>
        )}
      </div>

      {/* Calibration dialog */}
      <CalibrationDialog
        isOpen={showCalibrationDialog}
        onClose={() => {
          setShowCalibrationDialog(false)
          setIsCalibrating(false)
          setCalibrationPoints([])
        }}
        onConfirm={handleCalibrationConfirm}
        pixelDistance={calibrationPixelDist}
      />
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────

function hitTest(pt: Point, measurements: DrawingMeasurement[]): DrawingMeasurement | null {
  const threshold = 10
  for (let i = measurements.length - 1; i >= 0; i--) {
    const m = measurements[i]
    const coords = m.coordinates as Record<string, unknown>
    if (!coords) continue

    if (coords.points && Array.isArray(coords.points)) {
      const pts = (coords.points as number[][]).map(([x, y]) => ({ x, y }))
      for (const p of pts) {
        if (distance(pt, p) < threshold) return m
      }
      // Check line segments
      for (let j = 1; j < pts.length; j++) {
        if (distanceToSegment(pt, pts[j - 1], pts[j]) < threshold) return m
      }
    }

    if (coords.origin && coords.width != null) {
      const o = coords.origin as number[]
      const w = coords.width as number
      const h = coords.height as number
      if (pt.x >= o[0] - threshold && pt.x <= o[0] + w + threshold &&
          pt.y >= o[1] - threshold && pt.y <= o[1] + h + threshold) {
        return m
      }
    }

    if (coords.center && coords.radius != null) {
      const c = { x: (coords.center as number[])[0], y: (coords.center as number[])[1] }
      const r = coords.radius as number
      if (Math.abs(distance(pt, c) - r) < threshold || distance(pt, c) < r) {
        return m
      }
    }
  }
  return null
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return distance(p, a)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy })
}

function extractPoints(m: DrawingMeasurement): Point[] {
  const coords = m.coordinates as Record<string, unknown>
  if (!coords) return []
  if (coords.points && Array.isArray(coords.points)) {
    return (coords.points as number[][]).map(([x, y]) => ({ x, y }))
  }
  if (coords.origin) {
    const o = coords.origin as number[]
    const w = coords.width as number
    const h = coords.height as number
    return [{ x: o[0], y: o[1] }, { x: o[0] + w, y: o[1] + h }]
  }
  if (coords.center) {
    const c = coords.center as number[]
    const r = coords.radius as number
    return [{ x: c[0], y: c[1] }, { x: c[0] + r, y: c[1] }]
  }
  return []
}

function calculateQuantityFromMeasurement(tool: DrawingToolType, points: Point[], pxPerUnit: number, unit: string): { quantity: number; unit: string } {
  const hasScale = pxPerUnit > 0
  switch (tool) {
    case 'line': {
      if (points.length < 2) return { quantity: 0, unit }
      const px = distance(points[0], points[1])
      return { quantity: hasScale ? pixelsToReal(px, pxPerUnit) : px, unit: hasScale ? unit : 'px' }
    }
    case 'polyline': {
      const px = polylineLength(points)
      return { quantity: hasScale ? pixelsToReal(px, pxPerUnit) : px, unit: hasScale ? unit : 'px' }
    }
    case 'area': {
      const px = polygonArea(points)
      return { quantity: hasScale ? sqPixelsToReal(px, pxPerUnit) : px, unit: hasScale ? `${unit}²` : 'px²' }
    }
    case 'rectangle': {
      if (points.length < 2) return { quantity: 0, unit: `${unit}²` }
      const w = Math.abs(points[1].x - points[0].x)
      const h = Math.abs(points[1].y - points[0].y)
      const px = rectangleArea({ x: 0, y: 0 }, w, h)
      return { quantity: hasScale ? sqPixelsToReal(px, pxPerUnit) : px, unit: hasScale ? `${unit}²` : 'px²' }
    }
    case 'circle': {
      if (points.length < 2) return { quantity: 0, unit: `${unit}²` }
      const r = distance(points[0], points[1])
      const px = circleArea(r)
      return { quantity: hasScale ? sqPixelsToReal(px, pxPerUnit) : px, unit: hasScale ? `${unit}²` : 'px²' }
    }
    case 'count':
      return { quantity: points.length, unit: 'nr' }
    default:
      return { quantity: 0, unit: 'px' }
  }
}
