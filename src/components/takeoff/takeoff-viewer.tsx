'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { DrawingToolType, DrawingScale, DrawingMeasurement } from '@/lib/types'
import type { Point, SnapConfig, SnapTarget, SnapGeometry } from '@/lib/takeoff/geometry'
import {
  distance,
  polylineLength,
  polygonArea,
  rectangleArea,
  circleArea,
  pixelsToReal,
  sqPixelsToReal,
  DEFAULT_SNAP_CONFIG,
  findSnapTarget,
  constrainAngle,
} from '@/lib/takeoff/geometry'
import {
  renderMeasurements,
  renderActiveDrawing,
  renderCalibrationLine,
  renderSnapIndicator,
  renderAngleGuide,
  renderGrid,
} from '@/lib/takeoff/renderer'
import type { TakeoffMeasurement } from '@/lib/takeoff/renderer'
import { TakeoffToolbar } from './takeoff-toolbar'
import { MeasurementList } from './measurement-list'
import { CalibrationDialog } from './calibration-dialog'
import { PageThumbnails } from './page-thumbnails'
import { ZoomControls } from './zoom-controls'
import { KeyboardShortcutsHelp } from './keyboard-shortcuts-help'
import {
  getDrawingMeasurements,
  getDrawingScales,
  createDrawingMeasurement,
  updateDrawingMeasurement,
  deleteDrawingMeasurement,
  createDrawingScale,
} from '@/app/actions/drawings'
import { LiveBOQPanel } from './live-boq-panel'
import { AlertTriangle, PanelRightClose, PanelRightOpen, Keyboard } from 'lucide-react'

interface TakeoffViewerProps {
  drawingId: string
  projectId: string
  drawingUrl: string
  pageCount: number
}

type ToolType = DrawingToolType | 'select' | 'pan'

const DRAWING_TOOLS: string[] = ['line', 'polyline', 'area', 'rectangle', 'circle', 'count']
const TOOL_KEYS: Record<string, ToolType> = {
  v: 'select', h: 'pan', l: 'line', p: 'polyline',
  a: 'area', r: 'rectangle', o: 'circle', n: 'count',
}

const TOOL_LABELS: Record<string, string> = {
  select: 'Select',
  pan: 'Pan',
  line: 'Line',
  polyline: 'Polyline',
  area: 'Area',
  rectangle: 'Rectangle',
  circle: 'Circle',
  count: 'Count',
}

const SNAP_TYPE_COLORS: Record<string, string> = {
  endpoint: '#F59E0B',
  midpoint: '#8B5CF6',
  intersection: '#EF4444',
  perpendicular: '#06B6D4',
  nearest: '#10B981',
  grid: '#6366F1',
}

/** Convert DrawingMeasurement[] to SnapGeometry[] for the snap engine */
function measurementsToSnapGeometry(measurements: DrawingMeasurement[]): SnapGeometry[] {
  const result: SnapGeometry[] = []
  for (const m of measurements) {
    const coords = m.coordinates as Record<string, unknown>
    const sg: SnapGeometry = {
      id: m.id,
      points: [],
      type: m.tool_type as SnapGeometry['type'],
    }

    if (coords?.points && Array.isArray(coords.points)) {
      sg.points = (coords.points as number[][]).map(([x, y]) => ({ x, y }))
    } else if (coords?.origin && Array.isArray(coords.origin)) {
      const [ox, oy] = coords.origin as number[]
      const w = (coords.width as number) ?? 0
      const h = (coords.height as number) ?? 0
      sg.points = [
        { x: ox, y: oy },
        { x: ox + w, y: oy },
        { x: ox + w, y: oy + h },
        { x: ox, y: oy + h },
      ]
    } else if (coords?.center && Array.isArray(coords.center)) {
      const [cx, cy] = coords.center as number[]
      const r = (coords.radius as number) ?? 0
      // Represent circle as center + cardinal points
      sg.points = [
        { x: cx, y: cy },
        { x: cx + r, y: cy },
        { x: cx, y: cy - r },
        { x: cx - r, y: cy },
        { x: cx, y: cy + r },
      ]
    }

    if (sg.points.length > 0) {
      result.push(sg)
    }
  }
  return result
}

export function TakeoffViewer({ drawingId, projectId, drawingUrl, pageCount }: TakeoffViewerProps) {
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

  // Panel & help
  const [showPanel, setShowPanel] = useState(true)
  const [panelTab, setPanelTab] = useState<'measurements' | 'boq'>('measurements')
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Snapping
  const [snapConfig, setSnapConfig] = useState<SnapConfig>(DEFAULT_SNAP_CONFIG)
  const [currentSnap, setCurrentSnap] = useState<SnapTarget | null>(null)

  // Grid
  const [showGrid, setShowGrid] = useState(false)

  // Pan state
  const isPanning = useRef(false)
  const panStart = useRef<Point>({ x: 0, y: 0 })
  const offsetStart = useRef<Point>({ x: 0, y: 0 })
  const isSpaceDown = useRef(false)
  const isShiftDown = useRef(false)

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

  // ── Snap geometries (memoized) ───────────────────────────────────────
  const snapGeometries = measurementsToSnapGeometry(measurements)

  // ── Render overlay ───────────────────────────────────────────────────
  const renderOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Grid
    if (showGrid) {
      renderGrid(
        ctx,
        canvas.width,
        canvas.height,
        snapConfig.gridSize,
        1,
        scale?.px_per_unit,
        scale?.unit,
      )
    }

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

    const drawTool = activeTool as DrawingToolType
    if (DRAWING_TOOLS.includes(activeTool ?? '') && activePoints.length > 0) {
      const pts = [...activePoints]
      if (mousePos && (drawTool === 'polyline' || drawTool === 'area' || drawTool === 'line' || drawTool === 'rectangle' || drawTool === 'circle')) {
        if (drawTool === 'line' && pts.length === 1) pts.push(mousePos)
        else if (drawTool === 'rectangle' && pts.length === 1) pts.push(mousePos)
        else if (drawTool === 'circle' && pts.length === 1) pts.push(mousePos)
        else if ((drawTool === 'polyline' || drawTool === 'area') && pts.length >= 1) pts.push(mousePos)
      }
      renderActiveDrawing(ctx, drawTool, pts, 1, activeColor, scale?.px_per_unit ?? 0, scale?.unit ?? null)

      // Angle guide when shift is held
      if (isShiftDown.current && activePoints.length >= 1 && mousePos) {
        const origin = activePoints[activePoints.length - 1]
        const previous = activePoints.length >= 2 ? activePoints[activePoints.length - 2] : null
        if (drawTool === 'line' || drawTool === 'polyline' || drawTool === 'area') {
          renderAngleGuide(ctx, origin, mousePos, previous, 1)
        }
      }
    }

    // Count tool: show running count numbers on active points
    if (activeTool === 'count' && activePoints.length > 0) {
      const r = 12
      for (let i = 0; i < activePoints.length; i++) {
        const p = activePoints[i]
        ctx.fillStyle = activeColor
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.font = '700 12px Inter, system-ui, sans-serif'
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(i + 1), p.x, p.y)
      }
    }

    if (isCalibrating && calibrationPoints.length > 0) {
      const pts = [...calibrationPoints]
      if (mousePos && pts.length === 1) pts.push(mousePos)
      renderCalibrationLine(ctx, pts, 1)
    }

    // Snap indicator
    if (currentSnap) {
      renderSnapIndicator(ctx, currentSnap, 1)
    }

    if (mousePos && (DRAWING_TOOLS.includes(activeTool ?? '') || isCalibrating)) {
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
  }, [measurements, activeMeasurementId, activeTool, activePoints, mousePos, activeColor, isCalibrating, calibrationPoints, currentSnap, showGrid, snapConfig.gridSize, scale])

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

  // ── Compute effective cursor position (with snap + angle constraint) ──
  const getEffectiveCursor = useCallback(
    (rawPt: Point): { point: Point; snap: SnapTarget | null } => {
      let pt = rawPt
      let snap: SnapTarget | null = null

      // Shift-constrain first
      if (isShiftDown.current && activePoints.length >= 1) {
        const lastPt = activePoints[activePoints.length - 1]
        pt = constrainAngle(lastPt, pt, 45)
      }

      // Then snap
      snap = findSnapTarget(pt, snapGeometries, snapConfig, activePoints)
      if (snap) {
        pt = snap.point
      }

      return { point: pt, snap }
    },
    [snapGeometries, snapConfig, activePoints],
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
      const rawPt = screenToCanvas(e.clientX, e.clientY)

      if (isPanning.current) {
        setOffset({
          x: offsetStart.current.x + (e.clientX - panStart.current.x),
          y: offsetStart.current.y + (e.clientY - panStart.current.y),
        })
        setMousePos(rawPt)
        return
      }

      // Apply snap and angle constraint
      const { point, snap } = getEffectiveCursor(rawPt)
      setMousePos(point)
      setCurrentSnap(snap)
    },
    [screenToCanvas, getEffectiveCursor],
  )

  const handleMouseUp = useCallback(() => {
    isPanning.current = false
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning.current) return
      const rawPt = screenToCanvas(e.clientX, e.clientY)
      const { point: pt } = getEffectiveCursor(rawPt)

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

      const tool = activeTool as DrawingToolType
      if (!tool) return

      // Count tool: accumulate points on single click, complete on double-click
      if (tool === 'count') {
        setActivePoints((prev) => [...prev, pt])
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

      setActivePoints((prev) => [...prev, pt])
    },
    [activeTool, isCalibrating, calibrationPoints, activePoints, measurements, screenToCanvas, completeMeasurement, getEffectiveCursor],
  )

  const handleDoubleClick = useCallback(
    () => {
      if (activeTool === 'polyline' && activePoints.length >= 2) {
        completeMeasurement('polyline', activePoints)
        setActivePoints([])
      } else if (activeTool === 'area' && activePoints.length >= 3) {
        completeMeasurement('area', activePoints)
        setActivePoints([])
      } else if (activeTool === 'count' && activePoints.length >= 1) {
        completeMeasurement('count', activePoints)
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

  // ── Undo ─────────────────────────────────────────────────────────────
  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return
    const lastId = undoStack[undoStack.length - 1]
    await deleteDrawingMeasurement(lastId)
    setUndoStack((prev) => prev.slice(0, -1))
    await loadData()
  }, [undoStack, loadData])

  // ── Zoom helpers ─────────────────────────────────────────────────────
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(5, z + 0.25))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(0.3, z - 0.25))
  }, [])

  const handleFitToPage = useCallback(() => {
    if (!containerRef.current || canvasSize.width === 0) return
    const container = containerRef.current
    const cw = container.clientWidth
    const ch = container.clientHeight
    const baseW = canvasSize.width / zoom
    const baseH = canvasSize.height / zoom
    const fitZoom = Math.min(cw / baseW, ch / baseH) * 0.95
    setZoom(Math.max(0.3, Math.min(5, fitZoom)))
    setOffset({ x: 0, y: 0 })
  }, [canvasSize, zoom])

  const handleZoomSet = useCallback((z: number) => {
    setZoom(Math.max(0.3, Math.min(5, z)))
  }, [])

  // ── Page navigation helper ───────────────────────────────────────────
  const goToPage = useCallback((p: number) => {
    const clamped = Math.max(1, Math.min(pageCount, p))
    if (clamped !== page) {
      setPage(clamped)
      setOffset({ x: 0, y: 0 })
    }
  }, [page, pageCount])

  // ── Keyboard ─────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return

      if (e.key === ' ') { isSpaceDown.current = true; e.preventDefault(); return }
      if (e.key === 'Shift') { isShiftDown.current = true; return }

      if (e.key === 'Escape') {
        setActivePoints([])
        setIsCalibrating(false)
        setCalibrationPoints([])
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeMeasurementId) {
          deleteDrawingMeasurement(activeMeasurementId).then(() => loadData())
          setActiveMeasurementId(null)
        }
        return
      }

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        handleUndo()
        return
      }

      // Grid toggle: g
      if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey) {
        setShowGrid(v => !v)
        return
      }

      // Tool shortcuts
      const toolKey = TOOL_KEYS[e.key.toLowerCase()]
      if (toolKey && !e.ctrlKey && !e.metaKey) {
        setActiveTool(toolKey)
        setActivePoints([])
        setIsCalibrating(false)
        setCalibrationPoints([])
        return
      }

      // Zoom: +/= and -/_
      if (e.key === '=' || e.key === '+') { handleZoomIn(); return }
      if (e.key === '-' || e.key === '_') { handleZoomOut(); return }
      if (e.key === '0') { handleFitToPage(); return }

      // Page navigation: [ ] or PgUp/PgDn
      if (e.key === '[' || e.key === 'PageUp') { goToPage(page - 1); return }
      if (e.key === ']' || e.key === 'PageDown') { goToPage(page + 1); return }

      // Toggle panel: Tab
      if (e.key === 'Tab') { e.preventDefault(); setShowPanel(v => !v); return }

      // Help: ?
      if (e.key === '?') { setShowShortcuts(v => !v); return }
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === ' ') isSpaceDown.current = false
      if (e.key === 'Shift') isShiftDown.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [activeMeasurementId, loadData, handleZoomIn, handleZoomOut, handleFitToPage, goToPage, page, handleUndo])

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
  let cursor = 'default'
  if (activeTool === 'pan' || isPanning.current || isSpaceDown.current) cursor = 'grab'
  if (DRAWING_TOOLS.includes(activeTool ?? '') || isCalibrating) cursor = 'crosshair'
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

  // ── Compute real-world mouse coordinates ─────────────────────────────
  const realWorldCoords = mousePos && scale && scale.px_per_unit > 0
    ? { x: mousePos.x / scale.px_per_unit, y: mousePos.y / scale.px_per_unit }
    : null

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
        snapConfig={snapConfig}
        onSnapConfigChange={setSnapConfig}
        showGrid={showGrid}
        onGridToggle={() => setShowGrid(v => !v)}
      />

      {/* Scale warning */}
      {!scale && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm">
          <AlertTriangle size={16} />
          <span>Calibrate scale to get real measurements. Currently showing pixel units.</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Page thumbnails */}
        <PageThumbnails
          pdfDoc={pdfDoc}
          currentPage={page}
          pageCount={pageCount}
          onPageChange={goToPage}
        />

        {/* Main canvas area */}
        <div className="flex-1 relative overflow-hidden bg-slate-200 dark:bg-slate-900">
          {/* Page controls (for quick nav when no thumbnails visible) */}
          {pageCount > 1 && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-lg px-3 py-1 shadow-sm text-sm">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="text-slate-600 dark:text-slate-300 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-slate-500 dark:text-slate-400">
                {page} / {pageCount}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= pageCount}
                className="text-slate-600 dark:text-slate-300 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}

          {/* Zoom controls */}
          <ZoomControls
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitToPage={handleFitToPage}
            onZoomSet={handleZoomSet}
          />

          {/* Shortcuts + panel toggle */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-lg shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard size={16} />
            </button>
            <button
              onClick={() => setShowPanel((v) => !v)}
              className="p-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-lg shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
              title={showPanel ? 'Hide panel (Tab)' : 'Show panel (Tab)'}
            >
              {showPanel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>
          </div>

          {/* Status bar */}
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-3 bg-white/95 dark:bg-slate-800/95 backdrop-blur rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            {/* Active tool name */}
            {activeTool && (
              <>
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {TOOL_LABELS[activeTool] ?? activeTool}
                </span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
              </>
            )}
            {/* Snap mode indicators */}
            {snapConfig.enabled && (
              <>
                <span className="flex items-center gap-0.5">
                  {snapConfig.endpoint && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SNAP_TYPE_COLORS.endpoint }} title="Endpoint snap" />}
                  {snapConfig.midpoint && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SNAP_TYPE_COLORS.midpoint }} title="Midpoint snap" />}
                  {snapConfig.intersection && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SNAP_TYPE_COLORS.intersection }} title="Intersection snap" />}
                  {snapConfig.perpendicular && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SNAP_TYPE_COLORS.perpendicular }} title="Perpendicular snap" />}
                  {snapConfig.nearest && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SNAP_TYPE_COLORS.nearest }} title="Nearest snap" />}
                  {snapConfig.grid && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SNAP_TYPE_COLORS.grid }} title="Grid snap" />}
                </span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
              </>
            )}
            {scale ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Scale: 1 {scale.unit} = {scale.px_per_unit.toFixed(1)}px
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                No scale
              </span>
            )}
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span>{measurements.length} measurement{measurements.length !== 1 ? 's' : ''}</span>
            {mousePos && (
              <>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span className="font-mono">
                  {realWorldCoords
                    ? `${realWorldCoords.x.toFixed(2)}, ${realWorldCoords.y.toFixed(2)} ${scale!.unit}`
                    : `${Math.round(mousePos.x)}, ${Math.round(mousePos.y)}`
                  }
                </span>
              </>
            )}
            {currentSnap && (
              <>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SNAP_TYPE_COLORS[currentSnap.type] ?? '#F59E0B' }} />
                  {currentSnap.type}
                </span>
              </>
            )}
            {showGrid && (
              <>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span>Grid</span>
              </>
            )}
          </div>

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

        {/* Side panel with tabs */}
        {showPanel && (
          <div className="w-[300px] flex-shrink-0 flex flex-col bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700">
            {/* Tab bar */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 shrink-0">
              <button
                onClick={() => setPanelTab('measurements')}
                className={cn(
                  'flex-1 px-3 py-2 text-xs font-medium transition-colors',
                  panelTab === 'measurements'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300',
                )}
              >
                Measurements ({measurements.length})
              </button>
              <button
                onClick={() => setPanelTab('boq')}
                className={cn(
                  'flex-1 px-3 py-2 text-xs font-medium transition-colors',
                  panelTab === 'boq'
                    ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300',
                )}
              >
                Live BOQ
              </button>
            </div>
            {/* Tab content */}
            <div className="flex-1 min-h-0">
              {panelTab === 'measurements' ? (
                <MeasurementList
                  measurements={takeoffMs}
                  activeMeasurementId={activeMeasurementId}
                  onSelect={setActiveMeasurementId}
                  onDelete={handleDeleteMeasurement}
                  onLabelChange={handleLabelChange}
                />
              ) : (
                <LiveBOQPanel
                  projectId={projectId}
                  drawingId={drawingId}
                  measurementCount={measurements.length}
                />
              )}
            </div>
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

      <KeyboardShortcutsHelp
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  )
}
