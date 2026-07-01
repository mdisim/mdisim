'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
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
import { ScaleManager } from './scale-manager'
import { VolumeCalculator } from './volume-calculator'
import { BOQPicker } from './boq-picker'
import {
  createUndoRedoState,
  pushAction,
  undo as undoAction,
  redo as redoAction,
  canUndo as hasUndo,
  canRedo as hasRedo,
} from '@/lib/takeoff/undo-redo'
import type { UndoRedoState, UndoAction } from '@/lib/takeoff/undo-redo'
import { AISuggestionsPanel } from './ai-suggestions-panel'
import { analyzeDrawingWithAI, estimateProjectCosts } from '@/app/actions/ai-takeoff'
import type { AIFullAnalysis, AIDetectedElement, AIBOQItem } from '@/lib/ai/types'
import { AlertTriangle, PanelRightClose, PanelRightOpen, Keyboard, Link2 } from 'lucide-react'
import { linkDrawingMeasurementsToBOQ } from '@/app/actions/measurements'
import { createBOQItem } from '@/app/actions/boq'

interface TakeoffViewerProps {
  drawingId: string
  projectId: string
  drawingUrl: string
  pageCount: number
  drawingName?: string
  drawingType?: string
  onMeasurementSaved?: (dm: DrawingMeasurement, canvasDataUrl: string | null) => void
}

type ToolType = DrawingToolType | 'select' | 'pan' | 'polygon' | 'wall'

const DRAWING_TOOLS: string[] = ['line', 'polyline', 'area', 'rectangle', 'circle', 'count', 'polygon', 'wall']
const TOOL_KEYS: Record<string, ToolType> = {
  v: 'select', h: 'pan', l: 'line', p: 'polyline',
  a: 'area', r: 'rectangle', o: 'circle', n: 'count',
  g: 'polygon', w: 'wall',
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
  polygon: 'Polygon',
  wall: 'Wall Area',
}

const SNAP_TYPE_COLORS: Record<string, string> = {
  endpoint: '#F59E0B',
  midpoint: '#8B5CF6',
  intersection: '#EF4444',
  perpendicular: '#06B6D4',
  nearest: '#10B981',
  grid: '#6366F1',
  parallel: '#4F46E5',
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

export function TakeoffViewer({ drawingId, projectId, drawingUrl, pageCount, drawingName, drawingType, onMeasurementSaved }: TakeoffViewerProps) {
  // PDF state
  const [pdfDoc, setPdfDoc] = useState<unknown>(null)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1.5)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [loading, setLoading] = useState(true)
  const [pdfError, setPdfError] = useState<string | null>(null)
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
  const [undoRedoState, setUndoRedoState] = useState<UndoRedoState>(createUndoRedoState())

  // Handle dragging
  const [draggingHandle, setDraggingHandle] = useState<{ measurementId: string; handleIndex: number; originalCoords: unknown } | null>(null)

  // Panel & help
  const [showPanel, setShowPanel] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true)
  const [panelWidth, setPanelWidth] = useState(320)
  const panelDragRef = useRef<{ startX: number; startW: number } | null>(null)
  const [panelTab, setPanelTab] = useState<'measurements' | 'boq' | 'scales'>('measurements')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showVolumeCalc, setShowVolumeCalc] = useState(false)

  // Snapping
  const [snapConfig, setSnapConfig] = useState<SnapConfig>(DEFAULT_SNAP_CONFIG)
  const [currentSnap, setCurrentSnap] = useState<SnapTarget | null>(null)

  // Grid
  const [showGrid, setShowGrid] = useState(false)

  // Link mode
  const [linkMode, setLinkMode] = useState(false)
  const [selectedForLink, setSelectedForLink] = useState<string[]>([])
  const [showBOQPicker, setShowBOQPicker] = useState(false)
  const [boqPickerIds, setBOQPickerIds] = useState<string[]>([])

  // All scales
  const [allScales, setAllScales] = useState<DrawingScale[]>([])

  // Bidirectional highlighting
  const [highlightedMeasurementIds, setHighlightedMeasurementIds] = useState<Set<string>>(new Set())
  const [activeBOQItemId, setActiveBOQItemId] = useState<string | null>(null)

  // AI analysis
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false)
  const [aiResult, setAIResult] = useState<AIFullAnalysis | null>(null)
  const [aiHighlightedElement, setAIHighlightedElement] = useState<AIDetectedElement | null>(null)
  const [isEstimatingCosts, setIsEstimatingCosts] = useState(false)

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
        setPdfError(null)
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        const doc = await pdfjsLib.getDocument({ url: drawingUrl }).promise
        if (!cancelled) {
          setPdfDoc(doc)
          setLoading(false)
        }
      } catch (e) {
        console.error('Failed to load PDF document:', e)
        if (!cancelled) {
          setPdfError(e instanceof Error ? e.message : 'Failed to load PDF')
          setLoading(false)
        }
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
    setAllScales(scales)
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
  const snapGeometries = useMemo(() => measurementsToSnapGeometry(measurements), [measurements])

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
    renderMeasurements(ctx, takeoffMs, 1, activeMeasurementId ?? undefined, highlightedMeasurementIds.size > 0 ? highlightedMeasurementIds : undefined)

    const drawTool = activeTool as DrawingToolType
    if (DRAWING_TOOLS.includes(activeTool ?? '') && activePoints.length > 0) {
      const pts = [...activePoints]
      if (mousePos && (drawTool === 'polyline' || drawTool === 'area' || drawTool === 'line' || drawTool === 'rectangle' || drawTool === 'circle' || activeTool === 'polygon' || activeTool === 'wall')) {
        if (drawTool === 'line' && pts.length === 1) pts.push(mousePos)
        else if (drawTool === 'rectangle' && pts.length === 1) pts.push(mousePos)
        else if (drawTool === 'circle' && pts.length === 1) pts.push(mousePos)
        else if ((drawTool === 'polyline' || drawTool === 'area' || activeTool === 'polygon' || activeTool === 'wall') && pts.length >= 1) pts.push(mousePos)
      }
      const renderTool = activeTool === 'polygon' ? 'area' as DrawingToolType : activeTool === 'wall' ? 'polyline' as DrawingToolType : drawTool
      renderActiveDrawing(ctx, renderTool, pts, 1, activeColor, scale?.px_per_unit ?? 0, scale?.unit ?? null)

      // Angle guide when shift is held
      if (isShiftDown.current && activePoints.length >= 1 && mousePos) {
        const origin = activePoints[activePoints.length - 1]
        const previous = activePoints.length >= 2 ? activePoints[activePoints.length - 2] : null
        if (drawTool === 'line' || drawTool === 'polyline' || drawTool === 'area' || activeTool === 'polygon' || activeTool === 'wall') {
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

    // AI highlighted element bounding box
    if (aiHighlightedElement?.boundingBox) {
      const bb = aiHighlightedElement.boundingBox
      const bx = (bb.x / 100) * canvas.width
      const by = (bb.y / 100) * canvas.height
      const bw = (bb.width / 100) * canvas.width
      const bh = (bb.height / 100) * canvas.height
      ctx.save()
      ctx.strokeStyle = '#8B5CF6'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.fillStyle = 'rgba(139, 92, 246, 0.08)'
      ctx.fillRect(bx, by, bw, bh)
      ctx.strokeRect(bx, by, bw, bh)
      ctx.setLineDash([])
      ctx.font = '600 11px Inter, system-ui, sans-serif'
      ctx.fillStyle = '#8B5CF6'
      ctx.fillText(aiHighlightedElement.label, bx + 4, by - 4)
      ctx.restore()
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
  }, [measurements, activeMeasurementId, activeTool, activePoints, mousePos, activeColor, isCalibrating, calibrationPoints, currentSnap, showGrid, snapConfig.gridSize, scale, highlightedMeasurementIds, aiHighlightedElement])

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
        case 'area':
        case 'polygon' as DrawingToolType: {
          const a = polygonArea(points)
          quantity = pxPerUnit > 0 ? sqPixelsToReal(a, pxPerUnit) : a
          measureUnit = unit ? `${unit}²` : null
          coords = { points: points.map((p) => [p.x, p.y]) }
          break
        }
        case 'wall' as DrawingToolType: {
          const perim = polylineLength(points)
          const wallLength = pxPerUnit > 0 ? pixelsToReal(perim, pxPerUnit) : perim
          quantity = wallLength
          coords = { points: points.map((p) => [p.x, p.y]), wallHeight: 0 }
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

      const dbToolType = tool === ('polygon' as DrawingToolType) ? 'area' : tool === ('wall' as DrawingToolType) ? 'polyline' : tool
      const result = await createDrawingMeasurement({
        drawing_id: drawingId,
        page_number: page,
        scale_id: scale?.id,
        tool_type: dbToolType as DrawingToolType,
        coordinates: coords,
        quantity,
        unit: measureUnit ?? undefined,
        color: activeColor,
        label: tool === ('wall' as DrawingToolType) ? 'Wall Area' : undefined,
      })

      if (result.data) {
        setUndoRedoState(prev => pushAction(prev, {
          type: 'create',
          measurementId: result.data!.id,
          newData: result.data,
        }))
        if (onMeasurementSaved) {
          const snap = overlayCanvasRef.current?.toDataURL('image/png') ?? null
          onMeasurementSaved(result.data, snap)
        }
      }
      await loadData()
    },
    [drawingId, page, scale, activeColor, loadData, onMeasurementSaved],
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

      // Handle dragging: check if clicking near a handle of the active measurement
      if (activeTool === 'select' && activeMeasurementId && e.button === 0) {
        const pt = screenToCanvas(e.clientX, e.clientY)
        const m = measurements.find(m => m.id === activeMeasurementId)
        if (m) {
          const coords = m.coordinates as Record<string, unknown>
          const HANDLE_RADIUS = 12
          let handleIdx = -1

          if (coords?.points && Array.isArray(coords.points)) {
            const pts = coords.points as number[][]
            for (let i = 0; i < pts.length; i++) {
              if (distance(pt, { x: pts[i][0], y: pts[i][1] }) < HANDLE_RADIUS) {
                handleIdx = i
                break
              }
            }
          } else if (coords?.origin && Array.isArray(coords.origin)) {
            const [ox, oy] = coords.origin as number[]
            const w = (coords.width as number) ?? 0
            const h = (coords.height as number) ?? 0
            const corners = [[ox, oy], [ox + w, oy], [ox + w, oy + h], [ox, oy + h]]
            for (let i = 0; i < corners.length; i++) {
              if (distance(pt, { x: corners[i][0], y: corners[i][1] }) < HANDLE_RADIUS) {
                handleIdx = i
                break
              }
            }
          } else if (coords?.center && Array.isArray(coords.center)) {
            const [cx, cy] = coords.center as number[]
            const r = (coords.radius as number) ?? 0
            if (distance(pt, { x: cx + r, y: cy }) < HANDLE_RADIUS) {
              handleIdx = 1
            } else if (distance(pt, { x: cx, y: cy }) < HANDLE_RADIUS) {
              handleIdx = 0
            }
          }

          if (handleIdx >= 0) {
            e.preventDefault()
            e.stopPropagation()
            setDraggingHandle({
              measurementId: m.id,
              handleIndex: handleIdx,
              originalCoords: JSON.parse(JSON.stringify(coords)),
            })
            return
          }
        }
      }
    },
    [activeTool, offset, activeMeasurementId, measurements, screenToCanvas],
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

      // Handle dragging
      if (draggingHandle) {
        const { point } = getEffectiveCursor(rawPt)
        setMeasurements(prev => prev.map(m => {
          if (m.id !== draggingHandle.measurementId) return m
          const coords = JSON.parse(JSON.stringify(m.coordinates)) as Record<string, unknown>
          const idx = draggingHandle.handleIndex

          if (coords?.points && Array.isArray(coords.points)) {
            const pts = coords.points as number[][]
            if (idx < pts.length) {
              pts[idx] = [point.x, point.y]
            }
          } else if (coords?.origin && Array.isArray(coords.origin)) {
            const [ox, oy] = coords.origin as number[]
            const w = (coords.width as number) ?? 0
            const h = (coords.height as number) ?? 0
            // idx: 0=TL, 1=TR, 2=BR, 3=BL
            if (idx === 0) {
              coords.origin = [point.x, point.y]
              coords.width = ox + w - point.x
              coords.height = oy + h - point.y
            } else if (idx === 1) {
              coords.origin = [ox, point.y]
              coords.width = point.x - ox
              coords.height = oy + h - point.y
            } else if (idx === 2) {
              coords.width = point.x - ox
              coords.height = point.y - oy
            } else if (idx === 3) {
              coords.origin = [point.x, oy]
              coords.width = ox + w - point.x
              coords.height = point.y - oy
            }
          } else if (coords?.center && Array.isArray(coords.center)) {
            if (idx === 0) {
              coords.center = [point.x, point.y]
            } else if (idx === 1) {
              const [cx, cy] = coords.center as number[]
              coords.radius = distance({ x: cx, y: cy }, point)
            }
          }

          return { ...m, coordinates: coords }
        }))
        setMousePos(point)
        return
      }

      // Apply snap and angle constraint
      const { point, snap } = getEffectiveCursor(rawPt)
      setMousePos(point)
      setCurrentSnap(snap)
    },
    [screenToCanvas, getEffectiveCursor, draggingHandle],
  )

  const handleMouseUp = useCallback(async () => {
    isPanning.current = false

    if (draggingHandle) {
      const m = measurements.find(m => m.id === draggingHandle.measurementId)
      if (m) {
        const pxPerUnit = scale?.px_per_unit ?? 0
        const coords = m.coordinates as Record<string, unknown>
        let quantity = m.quantity

        // Recalculate quantity based on new coordinates
        if (coords?.points && Array.isArray(coords.points)) {
          const pts = (coords.points as number[][]).map(([x, y]) => ({ x, y }))
          if (m.tool_type === 'line' && pts.length === 2) {
            const d = distance(pts[0], pts[1])
            quantity = pxPerUnit > 0 ? pixelsToReal(d, pxPerUnit) : d
          } else if (m.tool_type === 'polyline') {
            const d = polylineLength(pts)
            quantity = pxPerUnit > 0 ? pixelsToReal(d, pxPerUnit) : d
          } else if (m.tool_type === 'area' && pts.length >= 3) {
            const a = polygonArea(pts)
            quantity = pxPerUnit > 0 ? sqPixelsToReal(a, pxPerUnit) : a
          } else if (m.tool_type === 'count') {
            quantity = pts.length
          }
        } else if (coords?.origin) {
          const w = Math.abs((coords.width as number) ?? 0)
          const h = Math.abs((coords.height as number) ?? 0)
          const a = w * h
          quantity = pxPerUnit > 0 ? sqPixelsToReal(a, pxPerUnit) : a
        } else if (coords?.center) {
          const r = (coords.radius as number) ?? 0
          const a = circleArea(r)
          quantity = pxPerUnit > 0 ? sqPixelsToReal(a, pxPerUnit) : a
        }

        // Record in undo history
        setUndoRedoState(prev => pushAction(prev, {
          type: 'update',
          measurementId: m.id,
          previousData: { coordinates: draggingHandle.originalCoords, quantity: m.quantity },
          newData: { coordinates: coords, quantity },
        }))

        // Save to DB
        await updateDrawingMeasurement(m.id, { quantity, coordinates: coords })
        await loadData()
      }
      setDraggingHandle(null)
    }
  }, [draggingHandle, measurements, scale, loadData])

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
      } else if (activeTool === 'polygon' && activePoints.length >= 3) {
        completeMeasurement('polygon' as DrawingToolType, activePoints)
        setActivePoints([])
      } else if (activeTool === 'wall' && activePoints.length >= 2) {
        completeMeasurement('wall' as DrawingToolType, activePoints)
        setActivePoints([])
      } else if (activeTool === 'count' && activePoints.length >= 1) {
        completeMeasurement('count', activePoints)
        setActivePoints([])
      }
    },
    [activeTool, activePoints, completeMeasurement],
  )

  // ── Wheel zoom (zoom toward cursor) ──────────────────────────────────
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top

      setZoom((prevZoom) => {
        const factor = e.deltaY > 0 ? 0.9 : 1.1
        const newZoom = Math.min(5, Math.max(0.3, prevZoom * factor))
        const scale = newZoom / prevZoom

        setOffset((prev) => ({
          x: cursorX - scale * (cursorX - prev.x),
          y: cursorY - scale * (cursorY - prev.y),
        }))

        return newZoom
      })
    },
    [],
  )

  // ── Pinch-to-zoom (touch) ────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let lastDist = 0
    let lastCenter = { x: 0, y: 0 }

    const getTouchDist = (t: TouchList) => {
      const dx = t[1].clientX - t[0].clientX
      const dy = t[1].clientY - t[0].clientY
      return Math.hypot(dx, dy)
    }
    const getTouchCenter = (t: TouchList, rect: DOMRect) => ({
      x: (t[0].clientX + t[1].clientX) / 2 - rect.left,
      y: (t[0].clientY + t[1].clientY) / 2 - rect.top,
    })

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        lastDist = getTouchDist(e.touches)
        lastCenter = getTouchCenter(e.touches, el.getBoundingClientRect())
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const dist = getTouchDist(e.touches)
        const center = getTouchCenter(e.touches, el.getBoundingClientRect())
        const scaleFactor = dist / lastDist

        setZoom((prev) => {
          const newZoom = Math.min(5, Math.max(0.3, prev * scaleFactor))
          const s = newZoom / prev
          setOffset((o) => ({
            x: center.x - s * (center.x - o.x),
            y: center.y - s * (center.y - o.y),
          }))
          return newZoom
        })

        lastDist = dist
        lastCenter = center
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  // ── Undo / Redo ──────────────────────────────────────────────────────
  const handleUndo = useCallback(async () => {
    const { state: newState, action } = undoAction(undoRedoState)
    if (!action) return
    setUndoRedoState(newState)

    if (action.type === 'create') {
      await deleteDrawingMeasurement(action.measurementId)
    } else if (action.type === 'delete' && action.previousData) {
      const prev = action.previousData as Record<string, unknown>
      await createDrawingMeasurement({
        drawing_id: prev.drawing_id as string,
        page_number: prev.page_number as number,
        scale_id: prev.scale_id as string | undefined,
        tool_type: prev.tool_type as string,
        coordinates: prev.coordinates,
        quantity: prev.quantity as number,
        unit: prev.unit as string | undefined,
        label: prev.label as string | undefined,
        color: prev.color as string | undefined,
      })
    } else if (action.type === 'update' && action.previousData) {
      const prev = action.previousData as Record<string, unknown>
      await updateDrawingMeasurement(action.measurementId, {
        quantity: prev.quantity as number,
      })
    }
    await loadData()
  }, [undoRedoState, loadData])

  const handleRedo = useCallback(async () => {
    const { state: newState, action } = redoAction(undoRedoState)
    if (!action) return
    setUndoRedoState(newState)

    if (action.type === 'create' && action.newData) {
      const nd = action.newData as Record<string, unknown>
      await createDrawingMeasurement({
        drawing_id: nd.drawing_id as string,
        page_number: nd.page_number as number,
        scale_id: nd.scale_id as string | undefined,
        tool_type: nd.tool_type as string,
        coordinates: nd.coordinates,
        quantity: nd.quantity as number,
        unit: nd.unit as string | undefined,
        label: nd.label as string | undefined,
        color: nd.color as string | undefined,
      })
    } else if (action.type === 'delete') {
      await deleteDrawingMeasurement(action.measurementId)
    } else if (action.type === 'update' && action.newData) {
      const nd = action.newData as Record<string, unknown>
      await updateDrawingMeasurement(action.measurementId, {
        quantity: nd.quantity as number,
      })
    }
    await loadData()
  }, [undoRedoState, loadData])

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
      setUndoRedoState(createUndoRedoState())
      setActivePoints([])
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

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || e.key === 'y') && (e.shiftKey || e.key === 'y')) {
        e.preventDefault()
        handleRedo()
        return
      }

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        handleUndo()
        return
      }

      // Grid toggle: Ctrl+G
      if (e.key.toLowerCase() === 'g' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
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
  }, [activeMeasurementId, loadData, handleZoomIn, handleZoomOut, handleFitToPage, goToPage, page, handleUndo, handleRedo])

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
      const m = measurements.find(m => m.id === id)
      if (m) {
        setUndoRedoState(prev => pushAction(prev, {
          type: 'delete',
          measurementId: id,
          previousData: m,
        }))
      }
      await deleteDrawingMeasurement(id)
      if (activeMeasurementId === id) setActiveMeasurementId(null)
      await loadData()
    },
    [activeMeasurementId, loadData, measurements],
  )

  // ── Label change ─────────────────────────────────────────────────────
  const handleLabelChange = useCallback(
    async (id: string, label: string) => {
      await updateDrawingMeasurement(id, { label })
      await loadData()
    },
    [loadData],
  )

  // ── Link mode handlers ────────────────────────────────────────────────
  const handleToggleLinkMode = useCallback(() => {
    setLinkMode(v => !v)
    setSelectedForLink([])
    if (!linkMode) setPanelTab('boq')
  }, [linkMode])

  const handleToggleMeasurementForLink = useCallback((id: string) => {
    setSelectedForLink(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }, [])

  const handleLinkToItem = useCallback(async (boqItemId: string) => {
    if (selectedForLink.length === 0) return
    await linkDrawingMeasurementsToBOQ(boqItemId, selectedForLink, projectId)
    setSelectedForLink([])
    setLinkMode(false)
    await loadData()
  }, [selectedForLink, projectId, loadData])

  const handleCreateAndLink = useCallback(async (description: string, unit: string) => {
    if (selectedForLink.length === 0) return
    const result = await createBOQItem({
      project_id: projectId,
      description,
      unit,
    })
    if (result.data) {
      await linkDrawingMeasurementsToBOQ(result.data.id, selectedForLink, projectId)
    }
    setSelectedForLink([])
    setLinkMode(false)
    await loadData()
  }, [selectedForLink, projectId, loadData])

  const handleOpenBOQPicker = useCallback((measurementIds: string[]) => {
    if (measurementIds.length === 0) return
    setBOQPickerIds(measurementIds)
    setShowBOQPicker(true)
  }, [])

  const handleBOQPickerLinked = useCallback(async () => {
    setBOQPickerIds([])
    setShowBOQPicker(false)
    setSelectedForLink([])
    setLinkMode(false)
    await loadData()
  }, [loadData])

  // BOQ → Drawing: when a BOQ item is clicked, highlight its measurements
  const handleBOQItemSelect = useCallback((boqItemId: string | null, linkedDmIds: string[]) => {
    if (boqItemId && linkedDmIds.length > 0) {
      setActiveBOQItemId(boqItemId)
      setHighlightedMeasurementIds(new Set(linkedDmIds))
    } else {
      setActiveBOQItemId(null)
      setHighlightedMeasurementIds(new Set())
    }
  }, [])


  // ── AI analysis handlers ─────────────────────────────────────────────
  const handleAIAnalyze = useCallback(async () => {
    if (!pdfCanvasRef.current) return
    setIsAIAnalyzing(true)
    setShowAIPanel(true)
    setAIResult(null)
    try {
      const canvas = pdfCanvasRef.current
      const tempCanvas = document.createElement('canvas')
      const maxDim = 2048
      const scaleFactor = Math.min(maxDim / canvas.width, maxDim / canvas.height, 1)
      tempCanvas.width = Math.round(canvas.width * scaleFactor)
      tempCanvas.height = Math.round(canvas.height * scaleFactor)
      const tctx = tempCanvas.getContext('2d')!
      tctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height)
      const dataUrl = tempCanvas.toDataURL('image/png')
      const base64 = dataUrl.split(',')[1]
      const result = await analyzeDrawingWithAI(base64, drawingName ?? 'Drawing', drawingType ?? 'general', page)
      setAIResult(result)
    } catch (e) {
      setAIResult({
        drawing: { drawingType: '', summary: '', elements: [], dimensions: [], detectedScale: null, repeatedPatterns: [] },
        boq: [],
        totalEstimatedCost: null,
        currency: 'USD',
        error: e instanceof Error ? e.message : 'Analysis failed',
      })
    } finally {
      setIsAIAnalyzing(false)
    }
  }, [page])

  const handleAIApproveElement = useCallback(async (element: AIDetectedElement, quantity: number, unit: string, boqDescription: string) => {
    await createBOQItem({
      project_id: projectId,
      description: boqDescription,
      unit,
      quantity,
      unit_rate: 0,
    })
  }, [projectId])

  const handleAIApproveBOQItem = useCallback(async (item: AIBOQItem) => {
    await createBOQItem({
      project_id: projectId,
      code: item.code,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.unitRate ?? 0,
    })
    // Error is silently ignored — BOQ item creation is best-effort from AI detection
  }, [projectId])

  const handleAIApproveAll = useCallback(async (elements: AIDetectedElement[]) => {
    for (const el of elements) {
      await createBOQItem({
        project_id: projectId,
        description: el.boqDescription,
        unit: el.boqUnit,
        quantity: el.estimatedQuantity ?? 0,
        unit_rate: 0,
      })
    }
  }, [projectId])

  const handleEstimateCosts = useCallback(async () => {
    if (!aiResult?.boq) return
    setIsEstimatingCosts(true)
    try {
      const items = aiResult.boq.flatMap(g => g.items.map(i => ({
        code: i.code,
        description: i.description,
        unit: i.unit,
        quantity: i.quantity,
      })))
      const estimates = await estimateProjectCosts(items, 'Construction project')
      const updated = { ...aiResult }
      for (const est of estimates) {
        for (const group of updated.boq) {
          for (const item of group.items) {
            if (item.code === est.boqItemCode) {
              item.unitRate = est.suggestedUnitRate
              item.amount = item.quantity * est.suggestedUnitRate
            }
          }
          group.subtotal = group.items.reduce((sum, i) => sum + (i.amount ?? 0), 0)
        }
      }
      updated.totalEstimatedCost = updated.boq.reduce((sum, g) => sum + (g.subtotal ?? 0), 0)
      setAIResult(updated)
    } finally {
      setIsEstimatingCosts(false)
    }
  }, [aiResult])

  // ── Cursor style ─────────────────────────────────────────────────────
  let cursor = 'default'
  // eslint-disable-next-line react-hooks/refs -- ref read is intentional for cursor styling during canvas interaction
  if (activeTool === 'pan' || isPanning.current || isSpaceDown.current) cursor = 'grab'
  if (DRAWING_TOOLS.includes(activeTool ?? '') || isCalibrating) cursor = 'crosshair'
  if (activeTool === 'select') cursor = 'default'
  if (draggingHandle) cursor = 'move'

  const takeoffMs: TakeoffMeasurement[] = useMemo(() => measurements.map((m) => ({
    id: m.id,
    tool_type: m.tool_type,
    coordinates: m.coordinates,
    quantity: m.quantity,
    unit: m.unit,
    color: m.color,
    label: m.label,
  })), [measurements])

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
        activeMeasurementId={activeMeasurementId}
        onDeleteMeasurement={handleDeleteMeasurement}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={hasUndo(undoRedoState)}
        canRedo={hasRedo(undoRedoState)}
        activeColor={activeColor}
        onColorChange={setActiveColor}
        snapConfig={snapConfig}
        onSnapConfigChange={setSnapConfig}
        showGrid={showGrid}
        onGridToggle={() => setShowGrid(v => !v)}
        onVolumeCalculator={() => setShowVolumeCalc(true)}
        onAIAnalyze={handleAIAnalyze}
        isAIAnalyzing={isAIAnalyzing}
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
        <div className="flex-1 relative overflow-hidden bg-[var(--color-surface)] dark:bg-[var(--color-surface)]">
          {/* Page controls (for quick nav when no thumbnails visible) */}
          {pageCount > 1 && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white/90 dark:bg-[var(--color-surface-elevated)]/90 backdrop-blur rounded-lg px-3 py-1 shadow-sm text-sm">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="text-[var(--color-text-muted)] dark:text-[var(--color-text-secondary)] disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">
                {page} / {pageCount}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= pageCount}
                className="text-[var(--color-text-muted)] dark:text-[var(--color-text-secondary)] disabled:opacity-40"
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
              className="p-1.5 bg-white/90 dark:bg-[var(--color-surface-elevated)]/90 backdrop-blur rounded-lg shadow-sm hover:bg-white dark:hover:bg-[var(--color-surface-elevated)] transition-colors text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard size={16} />
            </button>
            <button
              onClick={() => setShowPanel((v) => !v)}
              className="p-1.5 bg-white/90 dark:bg-[var(--color-surface-elevated)]/90 backdrop-blur rounded-lg shadow-sm hover:bg-white dark:hover:bg-[var(--color-surface-elevated)] transition-colors text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]"
              title={showPanel ? 'Hide panel (Tab)' : 'Show panel (Tab)'}
            >
              {showPanel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>
          </div>

          {/* Status bar */}
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-3 bg-white/95 dark:bg-[var(--color-surface-elevated)]/95 backdrop-blur rounded-lg shadow-lg border border-[var(--color-border)] dark:border-[var(--color-border)] px-3 py-1.5 text-[11px] text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">
            {/* Active tool name */}
            {activeTool && (
              <>
                <span className="font-medium text-[var(--color-text)]">
                  {TOOL_LABELS[activeTool] ?? activeTool}
                </span>
                <span className="text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">|</span>
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
                <span className="text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">|</span>
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
            <span className="text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">|</span>
            <span>{measurements.length} measurement{measurements.length !== 1 ? 's' : ''}</span>
            {mousePos && (
              <>
                <span className="text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">|</span>
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
                <span className="text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">|</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SNAP_TYPE_COLORS[currentSnap.type] ?? '#F59E0B' }} />
                  {currentSnap.type}
                </span>
              </>
            )}
            {showGrid && (
              <>
                <span className="text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">|</span>
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
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin h-8 w-8 border-4 border-[var(--color-amber-cta)] border-t-transparent rounded-full" />
                  <p className="text-xs text-[var(--color-text-muted)]">Loading drawing...</p>
                </div>
              </div>
            ) : pdfError ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3 text-center px-6">
                  <AlertTriangle size={28} className="text-amber-500" />
                  <p className="text-sm font-medium text-[var(--color-text)]">Failed to load drawing</p>
                  <p className="text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] max-w-sm">{pdfError}</p>
                </div>
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

          {/* AI Suggestions Panel */}
          <AISuggestionsPanel
            isOpen={showAIPanel}
            onClose={() => setShowAIPanel(false)}
            isAnalyzing={isAIAnalyzing}
            result={aiResult}
            onAnalyze={handleAIAnalyze}
            onApproveElement={handleAIApproveElement}
            onApproveBOQItem={handleAIApproveBOQItem}
            onApproveAll={handleAIApproveAll}
            onHighlightElement={setAIHighlightedElement}
            onEstimateCosts={handleEstimateCosts}
            isEstimatingCosts={isEstimatingCosts}
          />
        </div>

        {/* Resizable side panel */}
        {showPanel && (
          <>
          <div
            className="w-1 flex-shrink-0 cursor-col-resize bg-[var(--color-surface)] dark:bg-[var(--color-surface-hover)] hover:bg-[var(--color-amber-cta)] dark:hover:bg-[var(--color-amber-cta)] active:bg-[var(--color-amber-cta)] transition-colors relative group"
            onMouseDown={(e) => {
              e.preventDefault()
              panelDragRef.current = { startX: e.clientX, startW: panelWidth }
              const onMove = (ev: MouseEvent) => {
                if (!panelDragRef.current) return
                const delta = panelDragRef.current.startX - ev.clientX
                setPanelWidth(Math.max(240, Math.min(600, panelDragRef.current.startW + delta)))
              }
              const onUp = () => {
                panelDragRef.current = null
                document.removeEventListener('mousemove', onMove)
                document.removeEventListener('mouseup', onUp)
                document.body.style.cursor = ''
                document.body.style.userSelect = ''
              }
              document.body.style.cursor = 'col-resize'
              document.body.style.userSelect = 'none'
              document.addEventListener('mousemove', onMove)
              document.addEventListener('mouseup', onUp)
            }}
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-[var(--color-surface)] dark:bg-[var(--color-surface-hover)] group-hover:bg-[var(--color-amber-cta)] dark:group-hover:bg-[var(--color-amber-cta)] transition-colors" />
          </div>
          <div style={{ width: panelWidth }} className="flex-shrink-0 flex flex-col bg-white dark:bg-[var(--color-surface-elevated)]">
            {/* Top half: Measurements + Scales */}
            <div className="flex flex-col" style={{ height: '45%', minHeight: 120 }}>
              {/* Measurements header with link mode + scales toggle */}
              <div className="px-3 py-1.5 border-b border-[var(--color-border)] dark:border-[var(--color-border)] flex items-center justify-between gap-1 shrink-0">
                <span className="text-xs font-semibold text-[var(--color-text)]">
                  Measurements ({measurements.length})
                </span>
                <div className="flex items-center gap-1">
                  {measurements.length > 0 && (
                    <button
                      onClick={handleToggleLinkMode}
                      className={cn(
                        'flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                        linkMode
                          ? 'bg-[var(--color-amber)]/10 text-[var(--color-amber)]'
                          : 'text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
                      )}
                    >
                      <Link2 size={10} />
                      {linkMode ? `${selectedForLink.length} sel` : 'Link'}
                    </button>
                  )}
                  {linkMode && selectedForLink.length > 0 && (
                    <>
                      <button
                        onClick={() => handleOpenBOQPicker(selectedForLink)}
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                      >
                        Link ({selectedForLink.length})
                      </button>
                      <button
                        onClick={() => { setSelectedForLink([]); setLinkMode(false) }}
                        className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-[var(--color-text-secondary)] px-0.5"
                      >
                        ×
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setPanelTab(panelTab === 'scales' ? 'measurements' : 'scales')}
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                      panelTab === 'scales'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
                    )}
                  >
                    Scales
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {panelTab === 'scales' ? (
                  <div className="p-2">
                    <ScaleManager
                      drawingId={drawingId}
                      currentPage={page}
                      activeScale={scale}
                      scales={allScales}
                      onScaleSelect={setScale}
                      onCalibrate={handleCalibrate}
                      onScaleDelete={() => {}}
                      onRefresh={loadData}
                    />
                  </div>
                ) : (
                  <MeasurementList
                    measurements={takeoffMs}
                    activeMeasurementId={activeMeasurementId}
                    onSelect={(id) => {
                      if (linkMode) {
                        handleToggleMeasurementForLink(id)
                      } else {
                        setActiveMeasurementId(id)
                      }
                    }}
                    onDelete={handleDeleteMeasurement}
                    onLabelChange={handleLabelChange}
                    onLinkToBOQ={handleOpenBOQPicker}
                    selectedIds={linkMode ? selectedForLink : undefined}
                  />
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-[var(--color-surface)] dark:bg-[var(--color-surface-hover)] shrink-0" />

            {/* Bottom half: Live BOQ */}
            <div className="flex-1 min-h-0 flex flex-col">
              <LiveBOQPanel
                projectId={projectId}
                drawingId={drawingId}
                measurementCount={measurements.length}
                linkMode={linkMode && selectedForLink.length > 0}
                selectedMeasurementIds={selectedForLink}
                onLinkToItem={handleLinkToItem}
                onCreateAndLink={handleCreateAndLink}
                activeBOQItemId={activeBOQItemId}
                onBOQItemSelect={handleBOQItemSelect}
                highlightedBOQItemId={null}
                selectedDrawingMeasurementId={activeMeasurementId}
              />
            </div>
          </div>
          </>
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

      <VolumeCalculator
        isOpen={showVolumeCalc}
        onClose={() => setShowVolumeCalc(false)}
        drawingMeasurements={takeoffMs.map(m => ({ id: m.id, label: m.label ?? '', quantity: m.quantity, unit: m.unit ?? 'px' }))}
      />

      <BOQPicker
        isOpen={showBOQPicker}
        onClose={() => { setShowBOQPicker(false); setBOQPickerIds([]) }}
        projectId={projectId}
        drawingMeasurementIds={boqPickerIds}
        onLinked={handleBOQPickerLinked}
      />
    </div>
  )
}
