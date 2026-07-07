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
import type { UndoRedoState } from '@/lib/takeoff/undo-redo'
import { AlertTriangle, PanelRightClose, PanelRightOpen, Keyboard, Link2, FileWarning } from 'lucide-react'
import { linkDrawingMeasurementsToBOQ } from '@/app/actions/measurements'
import { createBOQItem } from '@/app/actions/boq'
import { parseDxfContent, renderDxfToCanvas } from '@/lib/takeoff/dwg-renderer'
import type { ParsedDxf } from '@/lib/takeoff/dwg-renderer'

interface DwgViewerProps {
  drawingId: string
  projectId: string
  drawingUrl: string
  drawingName?: string
  drawingType?: string
  fileType: string // 'dwg' | 'dxf'
  filePath?: string // storage path for DWG-to-DXF conversion
}

type ToolType = DrawingToolType | 'select' | 'pan' | 'polygon' | 'wall'

const DRAWING_TOOLS: string[] = ['line', 'polyline', 'area', 'rectangle', 'circle', 'count', 'polygon', 'wall']
const TOOL_KEYS: Record<string, ToolType> = {
  v: 'select', h: 'pan', l: 'line', p: 'polyline',
  a: 'area', r: 'rectangle', o: 'circle', n: 'count',
  g: 'polygon', w: 'wall',
}

const TOOL_LABELS: Record<string, string> = {
  select: 'Select', pan: 'Pan', line: 'Line', polyline: 'Polyline',
  area: 'Area', rectangle: 'Rectangle', circle: 'Circle', count: 'Count',
  polygon: 'Polygon', wall: 'Wall Area',
}

function measurementsToSnapGeometry(measurements: DrawingMeasurement[]): SnapGeometry[] {
  const result: SnapGeometry[] = []
  for (const m of measurements) {
    const coords = m.coordinates as Record<string, unknown>
    const sg: SnapGeometry = { id: m.id, points: [], type: m.tool_type as SnapGeometry['type'] }
    if (coords?.points && Array.isArray(coords.points)) {
      sg.points = (coords.points as number[][]).map(([x, y]) => ({ x, y }))
    } else if (coords?.origin && Array.isArray(coords.origin)) {
      const [ox, oy] = coords.origin as number[]
      const w = (coords.width as number) ?? 0
      const h = (coords.height as number) ?? 0
      sg.points = [{ x: ox, y: oy }, { x: ox + w, y: oy }, { x: ox + w, y: oy + h }, { x: ox, y: oy + h }]
    } else if (coords?.center && Array.isArray(coords.center)) {
      const [cx, cy] = coords.center as number[]
      const r = (coords.radius as number) ?? 0
      sg.points = [{ x: cx, y: cy }, { x: cx + r, y: cy }, { x: cx, y: cy - r }, { x: cx - r, y: cy }, { x: cx, y: cy + r }]
    }
    if (sg.points.length > 0) result.push(sg)
  }
  return result
}

export function DwgViewer({ drawingId, projectId, drawingUrl, drawingName, drawingType, fileType, filePath }: DwgViewerProps) {
  const [parsedDxf, setParsedDxf] = useState<ParsedDxf | null>(null)
  const [loading, setLoading] = useState(true)
  const [parseError, setParseError] = useState<string | null>(null)
  const [converting, setConverting] = useState(false)
  const [convertError, setConvertError] = useState<string | null>(null)
  const [convertLog, setConvertLog] = useState<string[]>([])
  const [convertedDxfUrl, setConvertedDxfUrl] = useState<string | null>(null)
  const [convertRetry, setConvertRetry] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  const isDwg = fileType === 'dwg'

  // ── DWG-to-DXF auto-conversion ─────────────────────────────────────
  useEffect(() => {
    if (!isDwg || !filePath) return
    let cancelled = false
    async function convert() {
      setConverting(true)
      setConvertError(null)
      setConvertLog([])
      try {
        const res = await fetch('/api/convert-dwg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath, projectId }),
        })
        const data = await res.json()
        if (data.log) setConvertLog(data.log)
        if (!res.ok) throw new Error(data.error || 'Conversion failed')
        if (cancelled) return
        const { getDrawingUrl } = await import('@/app/actions/drawings')
        const url = await getDrawingUrl(data.dxfPath)
        if (cancelled) return
        if (!url) throw new Error('Could not get URL for converted file')
        setConvertedDxfUrl(url)
      } catch (e) {
        if (!cancelled) {
          setConvertError(e instanceof Error ? e.message : 'Failed to convert DWG file')
        }
      } finally {
        if (!cancelled) setConverting(false)
      }
    }
    convert()
    return () => { cancelled = true }
  }, [isDwg, filePath, projectId, convertRetry])

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
  const [draggingHandle, setDraggingHandle] = useState<{ measurementId: string; handleIndex: number; originalCoords: unknown } | null>(null)

  // Panel
  const [showPanel, setShowPanel] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true)
  const [panelWidth, setPanelWidth] = useState(320)
  const panelDragRef = useRef<{ startX: number; startW: number } | null>(null)
  const [panelTab, setPanelTab] = useState<'measurements' | 'boq' | 'scales'>('measurements')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showVolumeCalc, setShowVolumeCalc] = useState(false)

  // Snapping
  const [snapConfig, setSnapConfig] = useState<SnapConfig>(DEFAULT_SNAP_CONFIG)
  const [currentSnap, setCurrentSnap] = useState<SnapTarget | null>(null)
  const [showGrid, setShowGrid] = useState(false)

  // Link mode
  const [linkMode, setLinkMode] = useState(false)
  const [selectedForLink, setSelectedForLink] = useState<string[]>([])
  const [showBOQPicker, setShowBOQPicker] = useState(false)
  const [boqPickerIds, setBOQPickerIds] = useState<string[]>([])
  const [allScales, setAllScales] = useState<DrawingScale[]>([])
  const [highlightedMeasurementIds, setHighlightedMeasurementIds] = useState<Set<string>>(new Set())
  const [activeBOQItemId, setActiveBOQItemId] = useState<string | null>(null)

  // Pan
  const isPanning = useRef(false)
  const panStart = useRef<Point>({ x: 0, y: 0 })
  const offsetStart = useRef<Point>({ x: 0, y: 0 })
  const isSpaceDown = useRef(false)
  const isShiftDown = useRef(false)

  // Canvas refs
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const renderQueued = useRef(false)

  // ── Load DXF file ───────────────────────────────────────────────────
  const effectiveUrl = isDwg ? convertedDxfUrl : drawingUrl

  useEffect(() => {
    if (isDwg && !convertedDxfUrl) {
      // Still converting or conversion failed — don't try to load
      setLoading(false)
      return
    }
    if (!effectiveUrl) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setParseError(null)
        const response = await fetch(effectiveUrl!)
        if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`)
        const text = await response.text()
        const parsed = parseDxfContent(text)
        if (!cancelled) {
          setParsedDxf(parsed)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setParseError(e instanceof Error ? e.message : 'Failed to parse DXF file')
          setLoading(false)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [effectiveUrl, isDwg, convertedDxfUrl])

  // ── Load measurements + scale ────────────────────────────────────────
  const loadData = useCallback(async () => {
    const [ms, scales] = await Promise.all([
      getDrawingMeasurements(drawingId, 1),
      getDrawingScales(drawingId),
    ])
    setMeasurements(ms)
    setAllScales(scales)
    const pageScale = scales.find((s) => s.page_number === 1)
    setScale(pageScale ?? null)
  }, [drawingId])

  useEffect(() => { loadData() }, [loadData])

  // ── Render DXF drawing ──────────────────────────────────────────────
  const renderDrawing = useCallback(() => {
    if (!parsedDxf || !drawingCanvasRef.current || !containerRef.current) return
    const container = containerRef.current
    const w = Math.round(container.clientWidth * zoom)
    const h = Math.round(container.clientHeight * zoom)
    if (w === 0 || h === 0) return
    const canvas = drawingCanvasRef.current
    canvas.width = w
    canvas.height = h
    setCanvasSize({ width: w, height: h })
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    renderDxfToCanvas(ctx, parsedDxf, w, h)
  }, [parsedDxf, zoom])

  useEffect(() => { renderDrawing() }, [renderDrawing])

  // ── Resize overlay ──────────────────────────────────────────────────
  useEffect(() => {
    if (!overlayCanvasRef.current) return
    overlayCanvasRef.current.width = canvasSize.width
    overlayCanvasRef.current.height = canvasSize.height
  }, [canvasSize])

  const snapGeometries = useMemo(() => measurementsToSnapGeometry(measurements), [measurements])

  // ── Render overlay ──────────────────────────────────────────────────
  const renderOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (showGrid) {
      renderGrid(ctx, canvas.width, canvas.height, snapConfig.gridSize, 1, scale?.px_per_unit, scale?.unit)
    }

    const takeoffMs: TakeoffMeasurement[] = measurements.map((m) => ({
      id: m.id, tool_type: m.tool_type, coordinates: m.coordinates,
      quantity: m.quantity, unit: m.unit, color: m.color, label: m.label,
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

      if (isShiftDown.current && activePoints.length >= 1 && mousePos) {
        const origin = activePoints[activePoints.length - 1]
        const previous = activePoints.length >= 2 ? activePoints[activePoints.length - 2] : null
        if (drawTool === 'line' || drawTool === 'polyline' || drawTool === 'area' || activeTool === 'polygon' || activeTool === 'wall') {
          renderAngleGuide(ctx, origin, mousePos, previous, 1)
        }
      }
    }

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

    if (currentSnap) renderSnapIndicator(ctx, currentSnap, 1)

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
  }, [measurements, activeMeasurementId, activeTool, activePoints, mousePos, activeColor, isCalibrating, calibrationPoints, currentSnap, showGrid, snapConfig.gridSize, scale, highlightedMeasurementIds])

  useEffect(() => {
    if (renderQueued.current) return
    renderQueued.current = true
    requestAnimationFrame(() => {
      renderOverlay()
      renderQueued.current = false
    })
  }, [renderOverlay])

  // ── Coordinate conversion ───────────────────────────────────────────
  const screenToCanvas = useCallback((clientX: number, clientY: number): Point => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
  }, [])

  const getEffectiveCursor = useCallback((rawPt: Point): { point: Point; snap: SnapTarget | null } => {
    let pt = rawPt
    let snap: SnapTarget | null = null
    if (isShiftDown.current && activePoints.length >= 1) {
      pt = constrainAngle(activePoints[activePoints.length - 1], pt, 45)
    }
    snap = findSnapTarget(pt, snapGeometries, snapConfig, activePoints)
    if (snap) pt = snap.point
    return { point: pt, snap }
  }, [snapGeometries, snapConfig, activePoints])

  // ── Complete measurement ─────────────────────────────────────────────
  const completeMeasurement = useCallback(async (tool: DrawingToolType, points: Point[]) => {
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
        quantity = pxPerUnit > 0 ? pixelsToReal(perim, pxPerUnit) : perim
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
      page_number: 1,
      scale_id: scale?.id,
      tool_type: dbToolType as DrawingToolType,
      coordinates: coords,
      quantity,
      unit: measureUnit ?? undefined,
      color: activeColor,
      label: tool === ('wall' as DrawingToolType) ? 'Wall Area' : undefined,
    })

    if (result.data) {
      setUndoRedoState(prev => pushAction(prev, { type: 'create', measurementId: result.data!.id, newData: result.data }))
    }
    await loadData()
  }, [drawingId, scale, activeColor, loadData])

  // ── Mouse handlers (same pattern as TakeoffViewer) ───────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
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
            if (distance(pt, { x: pts[i][0], y: pts[i][1] }) < HANDLE_RADIUS) { handleIdx = i; break }
          }
        }
        if (handleIdx >= 0) {
          e.preventDefault()
          e.stopPropagation()
          setDraggingHandle({ measurementId: m.id, handleIndex: handleIdx, originalCoords: JSON.parse(JSON.stringify(coords)) })
          return
        }
      }
    }
  }, [activeTool, offset, activeMeasurementId, measurements, screenToCanvas])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rawPt = screenToCanvas(e.clientX, e.clientY)
    if (isPanning.current) {
      setOffset({ x: offsetStart.current.x + (e.clientX - panStart.current.x), y: offsetStart.current.y + (e.clientY - panStart.current.y) })
      setMousePos(rawPt)
      return
    }
    if (draggingHandle) {
      const { point } = getEffectiveCursor(rawPt)
      setMeasurements(prev => prev.map(m => {
        if (m.id !== draggingHandle.measurementId) return m
        const coords = JSON.parse(JSON.stringify(m.coordinates)) as Record<string, unknown>
        if (coords?.points && Array.isArray(coords.points)) {
          const pts = coords.points as number[][]
          if (draggingHandle.handleIndex < pts.length) pts[draggingHandle.handleIndex] = [point.x, point.y]
        }
        return { ...m, coordinates: coords }
      }))
      setMousePos(point)
      return
    }
    const { point, snap } = getEffectiveCursor(rawPt)
    setMousePos(point)
    setCurrentSnap(snap)
  }, [screenToCanvas, getEffectiveCursor, draggingHandle])

  const handleMouseUp = useCallback(async () => {
    isPanning.current = false
    if (draggingHandle) {
      const m = measurements.find(m => m.id === draggingHandle.measurementId)
      if (m) {
        const coords = m.coordinates as Record<string, unknown>
        await updateDrawingMeasurement(m.id, { quantity: m.quantity, coordinates: coords })
        await loadData()
      }
      setDraggingHandle(null)
    }
  }, [draggingHandle, measurements, loadData])

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) return
    const rawPt = screenToCanvas(e.clientX, e.clientY)
    const { point: pt } = getEffectiveCursor(rawPt)

    if (isCalibrating) {
      const newPts = [...calibrationPoints, pt]
      setCalibrationPoints(newPts)
      if (newPts.length === 2) {
        setCalibPixelDist(distance(newPts[0], newPts[1]))
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
            if (distance(pt, { x: p[0], y: p[1] }) < HIT_RADIUS) { found = m.id; break }
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

    if (tool === 'count') { setActivePoints(prev => [...prev, pt]); return }
    if (tool === 'line' || tool === 'rectangle' || tool === 'circle') {
      const newPts = [...activePoints, pt]
      setActivePoints(newPts)
      if (newPts.length === 2) { completeMeasurement(tool, newPts); setActivePoints([]) }
      return
    }
    setActivePoints(prev => [...prev, pt])
  }, [activeTool, isCalibrating, calibrationPoints, activePoints, measurements, screenToCanvas, completeMeasurement, getEffectiveCursor])

  const handleDoubleClick = useCallback(() => {
    if (activeTool === 'polyline' && activePoints.length >= 2) { completeMeasurement('polyline', activePoints); setActivePoints([]) }
    else if (activeTool === 'area' && activePoints.length >= 3) { completeMeasurement('area', activePoints); setActivePoints([]) }
    else if (activeTool === 'polygon' && activePoints.length >= 3) { completeMeasurement('polygon' as DrawingToolType, activePoints); setActivePoints([]) }
    else if (activeTool === 'wall' && activePoints.length >= 2) { completeMeasurement('wall' as DrawingToolType, activePoints); setActivePoints([]) }
    else if (activeTool === 'count' && activePoints.length >= 1) { completeMeasurement('count', activePoints); setActivePoints([]) }
  }, [activeTool, activePoints, completeMeasurement])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(z => Math.min(5, Math.max(0.3, z + delta)))
  }, [])

  // ── Zoom helpers ────────────────────────────────────────────────────
  const handleZoomIn = useCallback(() => setZoom(z => Math.min(5, z + 0.25)), [])
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(0.3, z - 0.25)), [])
  const handleFitToPage = useCallback(() => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }, [])
  const handleZoomSet = useCallback((z: number) => setZoom(Math.max(0.3, Math.min(5, z))), [])

  // ── Undo/Redo ───────────────────────────────────────────────────────
  const handleUndo = useCallback(async () => {
    const { state: newState, action } = undoAction(undoRedoState)
    if (!action) return
    setUndoRedoState(newState)
    if (action.type === 'create') await deleteDrawingMeasurement(action.measurementId)
    else if (action.type === 'delete' && action.previousData) {
      const prev = action.previousData as Record<string, unknown>
      await createDrawingMeasurement({
        drawing_id: prev.drawing_id as string, page_number: prev.page_number as number,
        scale_id: prev.scale_id as string | undefined, tool_type: prev.tool_type as string,
        coordinates: prev.coordinates, quantity: prev.quantity as number,
        unit: prev.unit as string | undefined, label: prev.label as string | undefined,
        color: prev.color as string | undefined,
      })
    } else if (action.type === 'update' && action.previousData) {
      const prev = action.previousData as Record<string, unknown>
      await updateDrawingMeasurement(action.measurementId, { quantity: prev.quantity as number })
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
        drawing_id: nd.drawing_id as string, page_number: nd.page_number as number,
        scale_id: nd.scale_id as string | undefined, tool_type: nd.tool_type as string,
        coordinates: nd.coordinates, quantity: nd.quantity as number,
        unit: nd.unit as string | undefined, label: nd.label as string | undefined,
        color: nd.color as string | undefined,
      })
    } else if (action.type === 'delete') await deleteDrawingMeasurement(action.measurementId)
    else if (action.type === 'update' && action.newData) {
      const nd = action.newData as Record<string, unknown>
      await updateDrawingMeasurement(action.measurementId, { quantity: nd.quantity as number })
    }
    await loadData()
  }, [undoRedoState, loadData])

  // ── Keyboard ────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
      if (e.key === ' ') { isSpaceDown.current = true; e.preventDefault(); return }
      if (e.key === 'Shift') { isShiftDown.current = true; return }
      if (e.key === 'Escape') { setActivePoints([]); setIsCalibrating(false); setCalibrationPoints([]); return }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeMeasurementId) { deleteDrawingMeasurement(activeMeasurementId).then(() => loadData()); setActiveMeasurementId(null) }
        return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || e.key === 'y') && (e.shiftKey || e.key === 'y')) { e.preventDefault(); handleRedo(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); return }
      if (e.key.toLowerCase() === 'g' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setShowGrid(v => !v); return }
      const toolKey = TOOL_KEYS[e.key.toLowerCase()]
      if (toolKey && !e.ctrlKey && !e.metaKey) { setActiveTool(toolKey); setActivePoints([]); setIsCalibrating(false); setCalibrationPoints([]); return }
      if (e.key === '=' || e.key === '+') { handleZoomIn(); return }
      if (e.key === '-' || e.key === '_') { handleZoomOut(); return }
      if (e.key === '0') { handleFitToPage(); return }
      if (e.key === 'Tab') { e.preventDefault(); setShowPanel(v => !v); return }
      if (e.key === '?') { setShowShortcuts(v => !v); return }
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === ' ') isSpaceDown.current = false
      if (e.key === 'Shift') isShiftDown.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [activeMeasurementId, loadData, handleZoomIn, handleZoomOut, handleFitToPage, handleUndo, handleRedo])

  // ── Calibration confirm ─────────────────────────────────────────────
  const handleCalibConfirm = useCallback(async (realLength: number, unit: string) => {
    const pxPerUnit = calibPixelDist / realLength
    await createDrawingScale({
      drawing_id: drawingId, page_number: 1,
      pt1_x: calibrationPoints[0].x, pt1_y: calibrationPoints[0].y,
      pt2_x: calibrationPoints[1].x, pt2_y: calibrationPoints[1].y,
      real_length: realLength, unit, px_per_unit: pxPerUnit,
    })
    setShowCalibDialog(false)
    setIsCalibrating(false)
    setCalibrationPoints([])
    await loadData()
  }, [drawingId, calibPixelDist, calibrationPoints, loadData])

  const handleToolChange = useCallback((tool: string | null) => {
    setActiveTool(tool as ToolType); setActivePoints([]); setIsCalibrating(false); setCalibrationPoints([])
  }, [])

  const handleCalibrate = useCallback(() => {
    setIsCalibrating(v => !v); setCalibrationPoints([]); setActivePoints([])
    if (!isCalibrating) setActiveTool(null)
  }, [isCalibrating])

  const handleDeleteMeasurement = useCallback(async (id: string) => {
    const m = measurements.find(m => m.id === id)
    if (m) setUndoRedoState(prev => pushAction(prev, { type: 'delete', measurementId: id, previousData: m }))
    await deleteDrawingMeasurement(id)
    if (activeMeasurementId === id) setActiveMeasurementId(null)
    await loadData()
  }, [activeMeasurementId, loadData, measurements])

  const handleLabelChange = useCallback(async (id: string, label: string) => {
    await updateDrawingMeasurement(id, { label }); await loadData()
  }, [loadData])

  // Link mode handlers
  const handleToggleLinkMode = useCallback(() => { setLinkMode(v => !v); setSelectedForLink([]); if (!linkMode) setPanelTab('boq') }, [linkMode])
  const handleToggleMeasurementForLink = useCallback((id: string) => {
    setSelectedForLink(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }, [])
  const handleLinkToItem = useCallback(async (boqItemId: string) => {
    if (selectedForLink.length === 0) return
    await linkDrawingMeasurementsToBOQ(boqItemId, selectedForLink, projectId)
    setSelectedForLink([]); setLinkMode(false); await loadData()
  }, [selectedForLink, projectId, loadData])
  const handleCreateAndLink = useCallback(async (description: string, unit: string) => {
    if (selectedForLink.length === 0) return
    const result = await createBOQItem({ project_id: projectId, description, unit })
    if (result.data) await linkDrawingMeasurementsToBOQ(result.data.id, selectedForLink, projectId)
    setSelectedForLink([]); setLinkMode(false); await loadData()
  }, [selectedForLink, projectId, loadData])
  const handleOpenBOQPicker = useCallback((measurementIds: string[]) => {
    if (measurementIds.length === 0) return; setBOQPickerIds(measurementIds); setShowBOQPicker(true)
  }, [])
  const handleBOQPickerLinked = useCallback(async () => {
    setBOQPickerIds([]); setShowBOQPicker(false); setSelectedForLink([]); setLinkMode(false); await loadData()
  }, [loadData])
  const handleBOQItemSelect = useCallback((boqItemId: string | null, linkedDmIds: string[]) => {
    if (boqItemId && linkedDmIds.length > 0) { setActiveBOQItemId(boqItemId); setHighlightedMeasurementIds(new Set(linkedDmIds)) }
    else { setActiveBOQItemId(null); setHighlightedMeasurementIds(new Set()) }
  }, [])

  let cursor = 'default'
  if (activeTool === 'pan' || isPanning.current || isSpaceDown.current) cursor = 'grab'
  if (DRAWING_TOOLS.includes(activeTool ?? '') || isCalibrating) cursor = 'crosshair'
  if (activeTool === 'select') cursor = 'default'
  if (draggingHandle) cursor = 'move'

  const takeoffMs: TakeoffMeasurement[] = useMemo(() => measurements.map((m) => ({
    id: m.id, tool_type: m.tool_type, coordinates: m.coordinates,
    quantity: m.quantity, unit: m.unit, color: m.color, label: m.label,
  })), [measurements])

  // ── DWG conversion states ────────────────────────────────────────────
  if (isDwg && (converting || convertError) && !convertedDxfUrl) {
    if (converting) {
      return (
        <div className="flex flex-col h-full items-center justify-center gap-6 p-8">
          <div className="animate-spin h-10 w-10 border-4 border-[var(--color-brand)] border-t-transparent rounded-full" />
          <div className="text-center max-w-md">
            <h3 className="text-lg font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text)] mb-2">Converting DWG to DXF...</h3>
            <p className="text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] leading-relaxed">
              Automatically converting your DWG file so it can be viewed in the browser. This may take a moment.
            </p>
          </div>
        </div>
      )
    }
    if (convertError) {
      return (
        <div className="flex flex-col h-full items-center justify-center gap-6 p-8">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <FileWarning size={32} className="text-red-500" />
          </div>
          <div className="text-center max-w-lg">
            <h3 className="text-lg font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text)] mb-2">DWG Conversion Failed</h3>
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{convertError}</p>
            <button
              onClick={() => { setConvertError(null); setConvertLog([]); setConvertedDxfUrl(null); setConvertRetry(r => r + 1); }}
              className="px-4 py-2 mb-3 bg-[var(--color-brand)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-brand-strong)] transition-colors"
            >
              Retry Conversion
            </button>
            {convertLog.length > 0 && (
              <div className="text-left bg-[var(--color-surface-sunken)] rounded-lg p-3 max-h-64 overflow-y-auto">
                <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase mb-1.5">Pipeline Log</p>
                {convertLog.map((line, i) => (
                  <p key={i} className="text-[11px] font-mono text-[var(--color-text-secondary)] leading-relaxed">{line}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    }
  }

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
        onAIAnalyze={() => {}}
        isAIAnalyzing={false}
      />

      {!scale && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm">
          <AlertTriangle size={16} />
          <span>Calibrate scale to get real measurements. Currently showing pixel units.</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Main canvas area */}
        <div className="flex-1 relative overflow-hidden bg-[var(--color-surface)] dark:bg-[var(--color-surface)]">
          <ZoomControls zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onFitToPage={handleFitToPage} onZoomSet={handleZoomSet} />

          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <button onClick={() => setShowShortcuts(true)} className="p-1.5 bg-white/90 dark:bg-[var(--color-surface-elevated)]/90 backdrop-blur rounded-lg shadow-sm hover:bg-white dark:hover:bg-[var(--color-surface-elevated)] transition-colors text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]" title="Keyboard shortcuts (?)">
              <Keyboard size={16} />
            </button>
            <button onClick={() => setShowPanel(v => !v)} className="p-1.5 bg-white/90 dark:bg-[var(--color-surface-elevated)]/90 backdrop-blur rounded-lg shadow-sm hover:bg-white dark:hover:bg-[var(--color-surface-elevated)] transition-colors text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]" title={showPanel ? 'Hide panel (Tab)' : 'Show panel (Tab)'}>
              {showPanel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>
          </div>

          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-3 bg-white/95 dark:bg-[var(--color-surface-elevated)]/95 backdrop-blur rounded-lg shadow-lg border border-[var(--color-border)] dark:border-[var(--color-border)] px-3 py-1.5 text-[11px] text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">
            {activeTool && (
              <>
                <span className="font-medium text-[var(--color-text)]">{TOOL_LABELS[activeTool] ?? activeTool}</span>
                <span className="text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">|</span>
              </>
            )}
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              DXF
            </span>
            <span className="text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">|</span>
            <span>{measurements.length} measurement{measurements.length !== 1 ? 's' : ''}</span>
          </div>

          <div ref={containerRef} className="w-full h-full overflow-hidden" style={{ cursor }}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin h-8 w-8 border-4 border-[var(--color-brand)] border-t-transparent rounded-full" />
                  <p className="text-xs text-[var(--color-text-muted)]">Parsing DXF file...</p>
                </div>
              </div>
            ) : parseError ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3 text-center px-6">
                  <AlertTriangle size={28} className="text-amber-500" />
                  <p className="text-sm font-medium text-[var(--color-text)]">Failed to parse DXF</p>
                  <p className="text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] max-w-sm">{parseError}</p>
                </div>
              </div>
            ) : (
              <div style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, transformOrigin: '0 0', position: 'relative', width: canvasSize.width, height: canvasSize.height }}>
                <canvas ref={drawingCanvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
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

        {/* Side panel */}
        {showPanel && (
          <>
            <div
              className="w-1 flex-shrink-0 cursor-col-resize bg-[var(--color-surface)] dark:bg-[var(--color-surface-hover)] hover:bg-[var(--color-brand)] dark:hover:bg-[var(--color-brand)] active:bg-[var(--color-brand)] transition-colors relative group"
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
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-[var(--color-surface)] dark:bg-[var(--color-surface-hover)] group-hover:bg-[var(--color-brand)] dark:group-hover:bg-[var(--color-brand)] transition-colors" />
            </div>
            <div style={{ width: panelWidth }} className="flex-shrink-0 flex flex-col bg-white dark:bg-[var(--color-surface-elevated)]">
              <div className="flex flex-col" style={{ height: '45%', minHeight: 120 }}>
                <div className="px-3 py-1.5 border-b border-[var(--color-border)] dark:border-[var(--color-border)] flex items-center justify-between gap-1 shrink-0">
                  <span className="text-xs font-semibold text-[var(--color-text)]">Measurements ({measurements.length})</span>
                  <div className="flex items-center gap-1">
                    {measurements.length > 0 && (
                      <button onClick={handleToggleLinkMode} className={cn('flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors', linkMode ? 'bg-[var(--color-amber)]/10 text-[var(--color-amber)]' : 'text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]')}>
                        <Link2 size={10} />{linkMode ? `${selectedForLink.length} sel` : 'Link'}
                      </button>
                    )}
                    {linkMode && selectedForLink.length > 0 && (
                      <>
                        <button onClick={() => handleOpenBOQPicker(selectedForLink)} className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors">Link ({selectedForLink.length})</button>
                        <button onClick={() => { setSelectedForLink([]); setLinkMode(false) }} className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-[var(--color-text-secondary)] px-0.5">x</button>
                      </>
                    )}
                    <button onClick={() => setPanelTab(panelTab === 'scales' ? 'measurements' : 'scales')} className={cn('px-2 py-0.5 rounded text-[10px] font-medium transition-colors', panelTab === 'scales' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]')}>Scales</button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {panelTab === 'scales' ? (
                    <div className="p-2">
                      <ScaleManager drawingId={drawingId} currentPage={1} activeScale={scale} scales={allScales} onScaleSelect={setScale} onCalibrate={handleCalibrate} onScaleDelete={() => {}} onRefresh={loadData} />
                    </div>
                  ) : (
                    <MeasurementList
                      measurements={takeoffMs}
                      activeMeasurementId={activeMeasurementId}
                      onSelect={(id) => { if (linkMode) handleToggleMeasurementForLink(id); else setActiveMeasurementId(id) }}
                      onDelete={handleDeleteMeasurement}
                      onLabelChange={handleLabelChange}
                      onLinkToBOQ={handleOpenBOQPicker}
                      selectedIds={linkMode ? selectedForLink : undefined}
                    />
                  )}
                </div>
              </div>
              <div className="h-px bg-[var(--color-surface)] dark:bg-[var(--color-surface-hover)] shrink-0" />
              <div className="flex-1 min-h-0 flex flex-col">
                <LiveBOQPanel
                  projectId={projectId} drawingId={drawingId} measurementCount={measurements.length}
                  linkMode={linkMode && selectedForLink.length > 0} selectedMeasurementIds={selectedForLink}
                  onLinkToItem={handleLinkToItem} onCreateAndLink={handleCreateAndLink}
                  activeBOQItemId={activeBOQItemId} onBOQItemSelect={handleBOQItemSelect}
                  highlightedBOQItemId={null} selectedDrawingMeasurementId={activeMeasurementId}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <CalibrationDialog
        isOpen={showCalibDialog}
        onClose={() => { setShowCalibDialog(false); setIsCalibrating(false); setCalibrationPoints([]) }}
        onConfirm={handleCalibConfirm}
        pixelDistance={calibPixelDist}
      />
      <KeyboardShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <VolumeCalculator isOpen={showVolumeCalc} onClose={() => setShowVolumeCalc(false)} drawingMeasurements={takeoffMs.map(m => ({ id: m.id, label: m.label ?? '', quantity: m.quantity, unit: m.unit ?? 'px' }))} />
      <BOQPicker isOpen={showBOQPicker} onClose={() => { setShowBOQPicker(false); setBOQPickerIds([]) }} projectId={projectId} drawingMeasurementIds={boqPickerIds} onLinked={handleBOQPickerLinked} />
    </div>
  )
}
