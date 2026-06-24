'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { DrawingToolType, DrawingScale, DrawingMeasurement } from '@/lib/types'
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
import {
  renderMeasurements,
  renderActiveDrawing,
  renderCalibrationLine,
} from '@/lib/takeoff/renderer'
import type { TakeoffMeasurement } from '@/lib/takeoff/renderer'
import { TakeoffToolbar } from './takeoff-toolbar'
import { MeasurementList } from './measurement-list'
import { CalibrationDialog } from './calibration-dialog'
import {
  getDrawingMeasurements,
  getDrawingScales,
  createDrawingMeasurement,
  updateDrawingMeasurement,
  deleteDrawingMeasurement,
  createDrawingScale,
} from '@/app/actions/drawings'
import { AlertTriangle, PanelRightClose, PanelRightOpen } from 'lucide-react'

interface TakeoffViewerProps {
  drawingId: string
  drawingUrl: string
  pageCount: number
}

type ToolType = DrawingToolType | 'select' | 'pan'

export function TakeoffViewer({ drawingId, drawingUrl, pageCount }: TakeoffViewerProps) {
  // PDF state
  const [pdfDoc, setPdfDoc] = useState<unknown>(null)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1.5)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [loading, setLoading] = useState(true)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  // Tools state
  const [activeTool, setActiveTool] = useState<ToolType | null>('select')
  const [activePoints, setActivePoints] = useState<Point[]>([])
  const [mousePos, setMousePos] = useState<Point | null>(null)
  const [activeColor, setActiveColor] = useState('#3B82F6')

  // Calibration
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([])
  const [showCalibDialog, setShowCalibDialog] = useState(false)
  const [calibPixelDist, setCalibPixelDist] = useState(0)
  const [scale, setScale] = useState<DrawingScale | null>(null)

  // Measurements
  const [measurements, setMeasurements] = useState<DrawingMeasurement[]>([])
  const [activeMeasurementId, setActiveMeasurementId] = useState<string | null>(null)
  const [undoStack, setUndoStack] = useState<string[]>([])

  // Panel
  const [showPanel, setShowPanel] = useState(true)

  // Pan state
  const isPanning = useRef(false)
  const panStart = useRef<Point>({ x: 0, y: 0 })
  const offsetStart = useRef<Point>({ x: 0, y: 0 })
  const isSpaceDown = useRef(false)

  // Canvas refs
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const renderQueued = useRef(false)

  // ── Load PDF ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
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
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [drawingUrl])

  // ── Load measurements + scale ────────────────────────────────────────
  const loadData = useCallback(async () => {
    const [ms, scales] = await Promise.all([
      getDrawingMeasurements(drawingId, page),
      getDrawingScales(drawingId),
    ])
    setMeasurements(ms)
    const pageScale = scales.find((s) => s.page_number === page)
    setScale(pageScale ?? null)
  }, [drawingId, page])

  useEffect(() => { loadData() }, [loadData])

  // ── Render PDF page ──────────────────────────────────────────────────
  const renderPdf = useCallback(async () => {
    if (!pdfDoc || !pdfCanvasRef.current) return
    const doc = pdfDoc as {
      getPage: (n: number) => Promise<{
        getViewport: (o: { scale: number }) => { width: number; height: number }
        render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> }
      }>
    }
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

  // ── Resize overlay canvas ────────────────────────────────────────────
  useEffect(() => {
    if (!overlayCanvasRef.current) return
    overlayCanvasRef.current.width = canvasSize.width
    overlayCanvasRef.current.height = canvasSize.height
  }, [canvasSize])

  // ── Render overlay ───────────────────────────────────────────────────
  const renderOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Saved measurements
    const takeoffMs: TakeoffMeasurement[] = measurements.map((m) => ({
      id: m.id,
      tool_type: m.tool_type,
      coordinates: m.coordinates,
      quantity: m.quantity,
      unit: m.unit,
      color: m.color,
      label: m.label,
    }))
    renderMeasurements(ctx, takeoffMs, 1, activeMeasurementId ?? undefined)

    // Active drawing
    const drawTool = activeTool as DrawingToolType
    const drawingToolsList: string[] = ['line', 'polyline', 'area', 'rectangle', 'circle', 'count']
    if (drawingToolsList.includes(activeTool ?? '') && activePoints.length > 0) {
      const pts = [...activePoints]
      if (mousePos && (drawTool === 'polyline' || drawTool === 'area' || drawTool === 'line' || drawTool === 'rectangle' || drawTool === 'circle')) {
        if (drawTool === 'line' && pts.length === 1) pts.push(mousePos)
        else if (drawTool === 'rectangle' && pts.length === 1) pts.push(mousePos)
        else if (drawTool === 'circle' && pts.length === 1) pts.push(mousePos)
        else if ((drawTool === 'polyline' || drawTool === 'area') && pts.length >= 1) pts.push(mousePos)
      }
      renderActiveDrawing(ctx, drawTool, pts, 1, activeColor)
    }

    // Calibration
    if (isCalibrating && calibrationPoints.length > 0) {
      const pts = [...calibrationPoints]
      if (mousePos && pts.length === 1) pts.push(mousePos)
      renderCalibrationLine(ctx, pts, 1)
    }

    // Cursor crosshair
    if (mousePos && (drawingToolsList.includes(activeTool ?? '') || isCalibrating)) {
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(mousePos.x, 0)
      ctx.lineTo(mousePos.x, canvas.height)
      ctx.moveTo(0, mousePos.y)
      ctx.lineTo(canvas.width, mousePos.y)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }, [measurements, activeMeasurementId, activeTool, activePoints, mousePos, activeColor, isCalibrating, calibrationPoints])

  useEffect(() => {
    if (renderQueued.current) return
    renderQueued.current = true
    requestAnimationFrame(() => {
      renderOverlay()
      renderQueued.current = false
    })
  }, [renderOverlay])

  // ── Coordinate conversion ────────────────────────────────────────────
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number): Point => {
      const canvas = overlayCanvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      }
    },
    [],
  )

  // ── Complete measurement ─────────────────────────────────────────────
  const completeMeasurement = useCallback(
    async (tool: DrawingToolType, points: Point[]) => {
      const pxPerUnit = scale?.px_per_unit ?? 0
      const unit = scale?.unit ?? null
      let quantity = 0
      let coords: unknown = {}
      let measureUnit = unit

      switch (tool) {
        case 'line': {
          const d = distance(points[0], points[1])
          quantity = pxPerUnit > 0 ? pixelsToReal(d, pxPerUnit) : d
          coords = { points: points.map((p) => [p.x, p.y]) }
          break
        }
        case 'polyline': {
          const d = polylineLength(points)
          quantity = pxPerUnit > 0 ? pixelsToReal(d, pxPerUnit) : d
          coords = { points: points.map((p) => [p.x, p.y]) }
          break
        }
        case 'area': {
          const a = polygonArea(points)
          quantity = pxPerUnit > 0 ? sqPixelsToReal(a, pxPerUnit) : a
          measureUnit = unit ? `${unit}²` : null
          coords = { points: points.map((p) => [p.x, p.y]) }
          break
        }
        case 'rectangle': {
          const w = Math.abs(points[1].x - points[0].x)
          const h = Math.abs(points[1].y - points[0].y)
          const ox = Math.min(points[0].x, points[1].x)
          const oy = Math.min(points[0].y, points[1].y)
          const a = rectangleArea({ x: ox, y: oy }, w, h)
          quantity = pxPerUnit > 0 ? sqPixelsToReal(a, pxPerUnit) : a
          measureUnit = unit ? `${unit}²` : null
          coords = { origin: [ox, oy], width: w, height: h }
          break
        }
        case 'circle': {
          const r = distance(points[0], points[1])
          const a = circleArea(r)
          quantity = pxPerUnit > 0 ? sqPixelsToReal(a, pxPerUnit) : a
          measureUnit = unit ? `${unit}²` : null
          coords = { center: [points[0].x, points[0].y], radius: r }
          break
        }
        case 'count': {
          quantity = points.length
          measureUnit = 'nr'
          coords = { points: points.map((p) => [p.x, p.y]) }
          break
        }
      }

      const result = await createDrawingMeasurement({
        drawing_id: drawingId,
        page_number: page,
        scale_id: scale?.id,
        tool_type: tool,
        coordinates: coords,
        quantity,
        unit: measureUnit ?? undefined,
        color: activeColor,
      })

      if (result.data) {
        setUndoStack((prev) => [...prev, result.data!.id])
      }
      await loadData()
    },
    [drawingId, page, scale, activeColor, loadData],
  )

  // ── Mouse handlers ───────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (isSpaceDown.current && e.button === 0)) {
        isPanning.current = true
        panStart.current = { x: e.clientX, y: e.clientY }
        offsetStart.current = offset
        return
      }

      if (activeTool === 'pan' && e.button === 0) {
        isPanning.current = true
        panStart.current = { x: e.clientX, y: e.clientY }
        offsetStart.current = offset
        return
      }
    },
    [activeTool, offset],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pt = screenToCanvas(e.clientX, e.clientY)
      setMousePos(pt)

      if (isPanning.current) {
        setOffset({
          x: offsetStart.current.x + (e.clientX - panStart.current.x),
          y: offsetStart.current.y + (e.clientY - panStart.current.y),
        })
      }
    },
    [screenToCanvas],
  )

  const handleMouseUp = useCallback(() => {
    isPanning.current = false
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning.current) return
      const pt = screenToCanvas(e.clientX, e.clientY)

      // Calibration mode
      if (isCalibrating) {
        const newPts = [...calibrationPoints, pt]
        setCalibrationPoints(newPts)
        if (newPts.length === 2) {
          const d = distance(newPts[0], newPts[1])
          setCalibPixelDist(d)
          setShowCalibDialog(true)
        }
        return
      }

      // Select tool — hit test
      if (activeTool === 'select') {
        const HIT_RADIUS = 10
        let found: string | null = null
        for (const m of measurements) {
          const coords = m.coordinates as Record<string, unknown>
          if (coords?.points && Array.isArray(coords.points)) {
            for (const p of coords.points as number[][]) {
              if (distance(pt, { x: p[0], y: p[1] }) < HIT_RADIUS) {
                found = m.id
                break
              }
            }
          }
          if (coords?.center && Array.isArray(coords.center)) {
            const [cx, cy] = coords.center as number[]
            if (distance(pt, { x: cx, y: cy }) < ((coords.radius as number) ?? 0) + HIT_RADIUS) {
              found = m.id
            }
          }
          if (coords?.origin && Array.isArray(coords.origin)) {
            const [ox, oy] = coords.origin as number[]
            const w = (coords.width as number) ?? 0
            const h = (coords.height as number) ?? 0
            if (pt.x >= ox && pt.x <= ox + w && pt.y >= oy && pt.y <= oy + h) {
              found = m.id
            }
          }
          if (found) break
        }
        setActiveMeasurementId(found)
        return
      }

      if (activeTool === 'pan') return

      // Drawing tools
      const tool = activeTool as DrawingToolType
      if (!tool) return

      if (tool === 'count') {
        completeMeasurement('count', [pt])
        return
      }

      if (tool === 'line') {
        const newPts = [...activePoints, pt]
        setActivePoints(newPts)
        if (newPts.length === 2) {
          completeMeasurement('line', newPts)
          setActivePoints([])
        }
        return
      }

      if (tool === 'rectangle') {
        const newPts = [...activePoints, pt]
        setActivePoints(newPts)
        if (newPts.length === 2) {
          completeMeasurement('rectangle', newPts)
          setActivePoints([])
        }
        return
      }

      if (tool === 'circle') {
        const newPts = [...activePoints, pt]
        setActivePoints(newPts)
        if (newPts.length === 2) {
          completeMeasurement('circle', newPts)
          setActivePoints([])
        }
        return
      }

      // Polyline / Area — click to add, double-click to complete
      setActivePoints((prev) => [...prev, pt])
    },
    [activeTool, isCalibrating, calibrationPoints, activePoints, measurements, screenToCanvas, completeMeasurement],
  )

  const handleDoubleClick = useCallback(
    () => {
      if (activeTool === 'polyline' && activePoints.length >= 2) {
        completeMeasurement('polyline', activePoints)
        setActivePoints([])
      } else if (activeTool === 'area' && activePoints.length >= 3) {
        completeMeasurement('area', activePoints)
        setActivePoints([])
      }
    },
    [activeTool, activePoints, completeMeasurement],
  )

  // ── Wheel zoom ───────────────────────────────────────────────────────
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom((z) => Math.min(5, Math.max(0.3, z + delta)))
    },
    [],
  )

  // ── Keyboard ─────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === ' ') { isSpaceDown.current = true; e.preventDefault() }
      if (e.key === 'Escape') {
        setActivePoints([])
        setIsCalibrating(false)
        setCalibrationPoints([])
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeMeasurementId) {
          deleteDrawingMeasurement(activeMeasurementId).then(() => loadData())
          setActiveMeasurementId(null)
        }
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === ' ') isSpaceDown.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [activeMeasurementId, loadData])

  // ── Calibration confirm ──────────────────────────────────────────────
  const handleCalibConfirm = useCallback(
    async (realLength: number, unit: string) => {
      const pxPerUnit = calibPixelDist / realLength
      await createDrawingScale({
        drawing_id: drawingId,
        page_number: page,
        pt1_x: calibrationPoints[0].x,
        pt1_y: calibrationPoints[0].y,
        pt2_x: calibrationPoints[1].x,
        pt2_y: calibrationPoints[1].y,
        real_length: realLength,
        unit,
        px_per_unit: pxPerUnit,
      })
      setShowCalibDialog(false)
      setIsCalibrating(false)
      setCalibrationPoints([])
      await loadData()
    },
    [drawingId, page, calibPixelDist, calibrationPoints, loadData],
  )

  // ── Tool change ──────────────────────────────────────────────────────
  const handleToolChange = useCallback((tool: string | null) => {
    setActiveTool(tool as ToolType)
    setActivePoints([])
    setIsCalibrating(false)
    setCalibrationPoints([])
  }, [])

  const handleCalibrate = useCallback(() => {
    setIsCalibrating((v) => !v)
    setCalibrationPoints([])
    setActivePoints([])
    if (!isCalibrating) setActiveTool(null)
  }, [isCalibrating])

  // ── Undo ─────────────────────────────────────────────────────────────
  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return
    const lastId = undoStack[undoStack.length - 1]
    await deleteDrawingMeasurement(lastId)
    setUndoStack((prev) => prev.slice(0, -1))
    await loadData()
  }, [undoStack, loadData])

  // ── Delete from toolbar ──────────────────────────────────────────────
  const handleDeleteMeasurement = useCallback(
    async (id: string) => {
      await deleteDrawingMeasurement(id)
      if (activeMeasurementId === id) setActiveMeasurementId(null)
      await loadData()
    },
    [activeMeasurementId, loadData],
  )

  // ── Label change ─────────────────────────────────────────────────────
  const handleLabelChange = useCallback(
    async (id: string, label: string) => {
      await updateDrawingMeasurement(id, { label })
      await loadData()
    },
    [loadData],
  )

  // ── Cursor style ─────────────────────────────────────────────────────
  const drawingTools: string[] = ['line', 'polyline', 'area', 'rectangle', 'circle', 'count']
  let cursor = 'default'
  if (activeTool === 'pan' || isPanning.current || isSpaceDown.current) cursor = 'grab'
  if (drawingTools.includes(activeTool ?? '') || isCalibrating) cursor = 'crosshair'
  if (activeTool === 'select') cursor = 'default'

  const takeoffMs: TakeoffMeasurement[] = measurements.map((m) => ({
    id: m.id,
    tool_type: m.tool_type,
    coordinates: m.coordinates,
    quantity: m.quantity,
    unit: m.unit,
    color: m.color,
    label: m.label,
  }))

  return (
    <div className="flex flex-col h-full">
      <TakeoffToolbar
        activeTool={isCalibrating ? null : activeTool}
        onToolChange={handleToolChange}
        onCalibrate={handleCalibrate}
        isCalibrating={isCalibrating}
        measurements={takeoffMs}
        onDeleteMeasurement={handleDeleteMeasurement}
        onUndo={handleUndo}
        canUndo={undoStack.length > 0}
        activeColor={activeColor}
        onColorChange={setActiveColor}
      />

      {/* Scale warning */}
      {!scale && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm">
          <AlertTriangle size={16} />
          <span>Calibrate scale to get real measurements. Currently showing pixel units.</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Main canvas area */}
        <div className="flex-1 relative overflow-hidden bg-slate-200 dark:bg-slate-900">
          {/* Page controls */}
          {pageCount > 1 && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-lg px-3 py-1 shadow-sm text-sm">
              <button
                onClick={() => { setPage(Math.max(1, page - 1)); setOffset({ x: 0, y: 0 }) }}
                disabled={page <= 1}
                className="text-slate-600 dark:text-slate-300 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-slate-500 dark:text-slate-400">
                {page} / {pageCount}
              </span>
              <button
                onClick={() => { setPage(Math.min(pageCount, page + 1)); setOffset({ x: 0, y: 0 }) }}
                disabled={page >= pageCount}
                className="text-slate-600 dark:text-slate-300 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}

          {/* Zoom indicator */}
          <div className="absolute bottom-2 left-2 z-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400">
            {Math.round(zoom * 100)}%
          </div>

          {/* Panel toggle */}
          <button
            onClick={() => setShowPanel((v) => !v)}
            className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-lg shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-colors"
            title={showPanel ? 'Hide panel' : 'Show panel'}
          >
            {showPanel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>

          <div
            ref={containerRef}
            className="w-full h-full overflow-hidden"
            style={{ cursor }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px)`,
                  transformOrigin: '0 0',
                  position: 'relative',
                  width: canvasSize.width,
                  height: canvasSize.height,
                }}
              >
                <canvas ref={pdfCanvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
                <canvas
                  ref={overlayCanvasRef}
                  style={{ position: 'absolute', top: 0, left: 0 }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onClick={handleClick}
                  onDoubleClick={handleDoubleClick}
                  onWheel={handleWheel}
                />
              </div>
            )}
          </div>
        </div>

        {/* Measurement panel */}
        {showPanel && (
          <div className={cn('w-[280px] flex-shrink-0')}>
            <MeasurementList
              measurements={takeoffMs}
              activeMeasurementId={activeMeasurementId}
              onSelect={setActiveMeasurementId}
              onDelete={handleDeleteMeasurement}
              onLabelChange={handleLabelChange}
            />
          </div>
        )}
      </div>

      <CalibrationDialog
        isOpen={showCalibDialog}
        onClose={() => {
          setShowCalibDialog(false)
          setIsCalibrating(false)
          setCalibrationPoints([])
        }}
        onConfirm={handleCalibConfirm}
        pixelDistance={calibPixelDist}
      />
    </div>
  )
}
