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
import { AlertTriangle, PanelRightClose, PanelRightOpen, Keyboard, Link2 } from 'lucide-react'
import { linkDrawingMeasurementsToBOQ, createManualQuantity } from '@/app/actions/measurements'
import { createBOQItem } from '@/app/actions/boq'
import { createSketch } from '@/app/actions/sketches'
import { AISuggestionsPanel } from './ai-suggestions-panel'
import { analyzeDrawingWithAI, estimateProjectCosts } from '@/app/actions/ai-takeoff'
import type { AIFullAnalysis, AIDetectedElement, AIBOQItem } from '@/lib/ai/types'

interface ImageViewerProps {
  drawingId: string
  projectId: string
  drawingUrl: string
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

export function ImageViewer({ drawingId, projectId, drawingUrl, drawingName, drawingType, onMeasurementSaved }: ImageViewerProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [imgError, setImgError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  const [activeTool, setActiveTool] = useState<ToolType | null>('select')
  const [activePoints, setActivePoints] = useState<Point[]>([])
  const [mousePos, setMousePos] = useState<Point | null>(null)
  const [activeColor, setActiveColor] = useState('#3B82F6')

  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationPoints, setCalibrationPoints] = useState<Point[]>([])
  const [showCalibDialog, setShowCalibDialog] = useState(false)
  const [calibPixelDist, setCalibPixelDist] = useState(0)
  const [scale, setScale] = useState<DrawingScale | null>(null)

  const [measurements, setMeasurements] = useState<DrawingMeasurement[]>([])
  const [activeMeasurementId, setActiveMeasurementId] = useState<string | null>(null)
  const [undoRedoState, setUndoRedoState] = useState<UndoRedoState>(createUndoRedoState())
  const [draggingHandle, setDraggingHandle] = useState<{ measurementId: string; handleIndex: number; originalCoords: unknown } | null>(null)

  const [showPanel, setShowPanel] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true)
  const [panelWidth, setPanelWidth] = useState(320)
  const panelDragRef = useRef<{ startX: number; startW: number } | null>(null)
  const [panelTab, setPanelTab] = useState<'measurements' | 'boq' | 'scales'>('measurements')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showVolumeCalc, setShowVolumeCalc] = useState(false)

  const [snapConfig, setSnapConfig] = useState<SnapConfig>(DEFAULT_SNAP_CONFIG)
  const [currentSnap, setCurrentSnap] = useState<SnapTarget | null>(null)
  const [showGrid, setShowGrid] = useState(false)

  const [linkMode, setLinkMode] = useState(false)
  const [selectedForLink, setSelectedForLink] = useState<string[]>([])
  const [showBOQPicker, setShowBOQPicker] = useState(false)
  const [boqPickerIds, setBOQPickerIds] = useState<string[]>([])
  const [allScales, setAllScales] = useState<DrawingScale[]>([])
  const [highlightedMeasurementIds, setHighlightedMeasurementIds] = useState<Set<string>>(new Set())
  const [activeBOQItemId, setActiveBOQItemId] = useState<string | null>(null)

  // AI analysis
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [isAIAnalyzing, setIsAIAnalyzing] = useState(false)
  const [aiResult, setAIResult] = useState<AIFullAnalysis | null>(null)
  const [isEstimatingCosts, setIsEstimatingCosts] = useState(false)

  const isPanning = useRef(false)
  const panStart = useRef<Point>({ x: 0, y: 0 })
  const offsetStart = useRef<Point>({ x: 0, y: 0 })
  const isSpaceDown = useRef(false)
  const isShiftDown = useRef(false)

  const imgCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const renderQueued = useRef(false)

  // ── Load image ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      imgRef.current = img
      setImgLoaded(true)
      setLoading(false)
    }
    img.onerror = () => {
      if (cancelled) return
      setImgError('Failed to load image')
      setLoading(false)
    }
    img.src = drawingUrl
    return () => { cancelled = true }
  }, [drawingUrl])

  // ── Load data ───────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const [ms, scales] = await Promise.all([
      getDrawingMeasurements(drawingId, 1),
      getDrawingScales(drawingId),
    ])
    setMeasurements(ms)
    setAllScales(scales)
    setScale(scales.find(s => s.page_number === 1) ?? null)
  }, [drawingId])

  useEffect(() => { loadData() }, [loadData])

  // ── Render image ────────────────────────────────────────────────────
  const renderImage = useCallback(() => {
    if (!imgRef.current || !imgCanvasRef.current) return
    const img = imgRef.current
    const w = Math.round(img.naturalWidth * zoom)
    const h = Math.round(img.naturalHeight * zoom)
    const canvas = imgCanvasRef.current
    canvas.width = w
    canvas.height = h
    setCanvasSize({ width: w, height: h })
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, w, h)
  }, [imgLoaded, zoom]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { renderImage() }, [renderImage])

  useEffect(() => {
    if (!overlayCanvasRef.current) return
    overlayCanvasRef.current.width = canvasSize.width
    overlayCanvasRef.current.height = canvasSize.height
  }, [canvasSize])

  const snapGeometries = useMemo(() => measurementsToSnapGeometry(measurements), [measurements])

  // ── Render overlay (identical pattern) ──────────────────────────────
  const renderOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (showGrid) renderGrid(ctx, canvas.width, canvas.height, snapConfig.gridSize, 1, scale?.px_per_unit, scale?.unit)

    const takeoffMs: TakeoffMeasurement[] = measurements.map(m => ({
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
    }

    if (activeTool === 'count' && activePoints.length > 0) {
      for (let i = 0; i < activePoints.length; i++) {
        const p = activePoints[i]
        ctx.fillStyle = activeColor; ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2); ctx.fill()
        ctx.font = '700 12px Inter, system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
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
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4])
      ctx.beginPath(); ctx.moveTo(mousePos.x, 0); ctx.lineTo(mousePos.x, canvas.height)
      ctx.moveTo(0, mousePos.y); ctx.lineTo(canvas.width, mousePos.y); ctx.stroke(); ctx.setLineDash([])
    }
  }, [measurements, activeMeasurementId, activeTool, activePoints, mousePos, activeColor, isCalibrating, calibrationPoints, currentSnap, showGrid, snapConfig.gridSize, scale, highlightedMeasurementIds])

  useEffect(() => {
    if (renderQueued.current) return
    renderQueued.current = true
    requestAnimationFrame(() => { renderOverlay(); renderQueued.current = false })
  }, [renderOverlay])

  const screenToCanvas = useCallback((clientX: number, clientY: number): Point => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: (clientX - rect.left) * (canvas.width / rect.width), y: (clientY - rect.top) * (canvas.height / rect.height) }
  }, [])

  const getEffectiveCursor = useCallback((rawPt: Point): { point: Point; snap: SnapTarget | null } => {
    let pt = rawPt; let snap: SnapTarget | null = null
    if (isShiftDown.current && activePoints.length >= 1) pt = constrainAngle(activePoints[activePoints.length - 1], pt, 45)
    snap = findSnapTarget(pt, snapGeometries, snapConfig, activePoints)
    if (snap) pt = snap.point
    return { point: pt, snap }
  }, [snapGeometries, snapConfig, activePoints])

  const completeMeasurement = useCallback(async (tool: DrawingToolType, points: Point[]) => {
    const pxPerUnit = scale?.px_per_unit ?? 0
    const unit = scale?.unit ?? null
    let quantity = 0; let coords: unknown = {}; let measureUnit = unit

    switch (tool) {
      case 'line': { const d = distance(points[0], points[1]); quantity = pxPerUnit > 0 ? pixelsToReal(d, pxPerUnit) : d; coords = { points: points.map(p => [p.x, p.y]) }; break }
      case 'polyline': { const d = polylineLength(points); quantity = pxPerUnit > 0 ? pixelsToReal(d, pxPerUnit) : d; coords = { points: points.map(p => [p.x, p.y]) }; break }
      case 'area': case 'polygon' as DrawingToolType: { const a = polygonArea(points); quantity = pxPerUnit > 0 ? sqPixelsToReal(a, pxPerUnit) : a; measureUnit = unit ? `${unit}²` : null; coords = { points: points.map(p => [p.x, p.y]) }; break }
      case 'wall' as DrawingToolType: { const perim = polylineLength(points); quantity = pxPerUnit > 0 ? pixelsToReal(perim, pxPerUnit) : perim; coords = { points: points.map(p => [p.x, p.y]), wallHeight: 0 }; break }
      case 'rectangle': { const w = Math.abs(points[1].x - points[0].x); const h = Math.abs(points[1].y - points[0].y); const ox = Math.min(points[0].x, points[1].x); const oy = Math.min(points[0].y, points[1].y); quantity = pxPerUnit > 0 ? sqPixelsToReal(rectangleArea({ x: ox, y: oy }, w, h), pxPerUnit) : rectangleArea({ x: ox, y: oy }, w, h); measureUnit = unit ? `${unit}²` : null; coords = { origin: [ox, oy], width: w, height: h }; break }
      case 'circle': { const r = distance(points[0], points[1]); quantity = pxPerUnit > 0 ? sqPixelsToReal(circleArea(r), pxPerUnit) : circleArea(r); measureUnit = unit ? `${unit}²` : null; coords = { center: [points[0].x, points[0].y], radius: r }; break }
      case 'count': { quantity = points.length; measureUnit = 'nr'; coords = { points: points.map(p => [p.x, p.y]) }; break }
    }

    const dbToolType = tool === ('polygon' as DrawingToolType) ? 'area' : tool === ('wall' as DrawingToolType) ? 'polyline' : tool
    const result = await createDrawingMeasurement({
      drawing_id: drawingId, page_number: 1, scale_id: scale?.id,
      tool_type: dbToolType as DrawingToolType, coordinates: coords, quantity,
      unit: measureUnit ?? undefined, color: activeColor,
      label: tool === ('wall' as DrawingToolType) ? 'Wall Area' : undefined,
    })
    if (result.data) {
      setUndoRedoState(prev => pushAction(prev, { type: 'create', measurementId: result.data!.id, newData: result.data }))
      if (onMeasurementSaved) {
        onMeasurementSaved(result.data, compositeSnapshot())
      }
    }
    await loadData()
  }, [drawingId, scale, activeColor, loadData, onMeasurementSaved])

  // ── Composite the image + overlay canvases into one PNG snapshot ──────
  const compositeSnapshot = useCallback((): string | null => {
    const imgCanvas = imgCanvasRef.current
    const overlayCanvas = overlayCanvasRef.current
    if (!imgCanvas) return null
    const temp = document.createElement('canvas')
    temp.width = imgCanvas.width
    temp.height = imgCanvas.height
    const ctx = temp.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(imgCanvas, 0, 0)
    if (overlayCanvas) ctx.drawImage(overlayCanvas, 0, 0)
    return temp.toDataURL('image/png')
  }, [])

  // ── Volume Calculator → quantity record ─────────────────────────────
  const handleAddVolumeMeasurement = useCallback(async (item: { description: string; quantity: number; unit: string }) => {
    const result = await createManualQuantity({
      projectId,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      measurementType: 'volume',
      drawingId,
      pageNumber: 1,
    })
    if (result.error || !result.lineId) return
    const snap = compositeSnapshot()
    if (snap) {
      await createSketch({
        projectId,
        drawingId,
        miId: result.miId || undefined,
        lineId: result.lineId,
        imageDataUrl: snap,
        quantity: item.quantity,
        unit: item.unit,
        formula: item.description,
        pageNumber: 1,
        drawingName,
        snapshotType: 'auto',
      })
    }
    await loadData()
  }, [projectId, drawingId, drawingName, loadData, compositeSnapshot])

  // ── AI analysis ───────────────────────────────────────────────────────
  const attachAISketch = useCallback(async (miId: string | undefined, lineId: string, quantity: number, unit: string, formula: string) => {
    const snap = compositeSnapshot()
    if (!snap) return
    await createSketch({
      projectId,
      drawingId,
      miId: miId || undefined,
      lineId,
      imageDataUrl: snap,
      quantity,
      unit,
      formula,
      pageNumber: 1,
      drawingName,
      snapshotType: 'auto',
    })
  }, [projectId, drawingId, drawingName, compositeSnapshot])

  const handleAIAnalyze = useCallback(async () => {
    setIsAIAnalyzing(true)
    setShowAIPanel(true)
    setAIResult(null)
    try {
      const snap = compositeSnapshot()
      if (!snap) throw new Error('Could not capture drawing snapshot')
      const base64 = snap.split(',')[1]
      const result = await analyzeDrawingWithAI(base64, drawingName ?? 'Drawing', drawingType ?? 'general', 1)
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
  }, [drawingName, drawingType, compositeSnapshot])

  const handleAIApproveElement = useCallback(async (element: AIDetectedElement, quantity: number, unit: string, boqDescription: string) => {
    const result = await createManualQuantity({ projectId, description: boqDescription, quantity, unit, drawingId, pageNumber: 1 })
    if (result.lineId) await attachAISketch(result.miId, result.lineId, quantity, unit, `AI: ${element.type}`)
  }, [projectId, drawingId, attachAISketch])

  const handleAIApproveBOQItem = useCallback(async (item: AIBOQItem) => {
    const result = await createManualQuantity({ projectId, description: item.description, quantity: item.quantity, unit: item.unit, drawingId, pageNumber: 1 })
    if (result.lineId) await attachAISketch(result.miId, result.lineId, item.quantity, item.unit, `AI BOQ: ${item.code ?? item.description}`)
  }, [projectId, drawingId, attachAISketch])

  const handleAIApproveAll = useCallback(async (elements: AIDetectedElement[]) => {
    for (const el of elements) {
      const result = await createManualQuantity({ projectId, description: el.boqDescription, quantity: el.estimatedQuantity ?? 0, unit: el.boqUnit, drawingId, pageNumber: 1 })
      if (result.lineId) await attachAISketch(result.miId, result.lineId, el.estimatedQuantity ?? 0, el.boqUnit, `AI: ${el.type}`)
    }
  }, [projectId, drawingId, attachAISketch])

  const handleEstimateCosts = useCallback(async () => {
    if (!aiResult?.boq) return
    setIsEstimatingCosts(true)
    try {
      const items = aiResult.boq.flatMap(g => g.items.map(i => ({ code: i.code, description: i.description, unit: i.unit, quantity: i.quantity })))
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

  // Mouse handlers (same as DwgViewer pattern)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (isSpaceDown.current && e.button === 0) || (activeTool === 'pan' && e.button === 0)) {
      isPanning.current = true; panStart.current = { x: e.clientX, y: e.clientY }; offsetStart.current = offset; return
    }
  }, [activeTool, offset])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rawPt = screenToCanvas(e.clientX, e.clientY)
    if (isPanning.current) {
      setOffset({ x: offsetStart.current.x + (e.clientX - panStart.current.x), y: offsetStart.current.y + (e.clientY - panStart.current.y) })
      setMousePos(rawPt); return
    }
    const { point, snap } = getEffectiveCursor(rawPt)
    setMousePos(point); setCurrentSnap(snap)
  }, [screenToCanvas, getEffectiveCursor])

  const handleMouseUp = useCallback(() => { isPanning.current = false }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) return
    const rawPt = screenToCanvas(e.clientX, e.clientY)
    const { point: pt } = getEffectiveCursor(rawPt)

    if (isCalibrating) {
      const newPts = [...calibrationPoints, pt]; setCalibrationPoints(newPts)
      if (newPts.length === 2) { setCalibPixelDist(distance(newPts[0], newPts[1])); setShowCalibDialog(true) }
      return
    }
    if (activeTool === 'select') {
      let found: string | null = null
      for (const m of measurements) {
        const coords = m.coordinates as Record<string, unknown>
        if (coords?.points && Array.isArray(coords.points)) {
          for (const p of coords.points as number[][]) {
            if (distance(pt, { x: p[0], y: p[1] }) < 10) { found = m.id; break }
          }
        }
        if (found) break
      }
      setActiveMeasurementId(found); return
    }
    if (activeTool === 'pan') return
    const tool = activeTool as DrawingToolType
    if (!tool) return
    if (tool === 'count') { setActivePoints(prev => [...prev, pt]); return }
    if (tool === 'line' || tool === 'rectangle' || tool === 'circle') {
      const newPts = [...activePoints, pt]; setActivePoints(newPts)
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

  const handleWheel = useCallback((e: React.WheelEvent) => { e.preventDefault(); setZoom(z => Math.min(5, Math.max(0.3, z + (e.deltaY > 0 ? -0.1 : 0.1)))) }, [])

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(5, z + 0.25)), [])
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(0.3, z - 0.25)), [])
  const handleFitToPage = useCallback(() => { setZoom(1); setOffset({ x: 0, y: 0 }) }, [])
  const handleZoomSet = useCallback((z: number) => setZoom(Math.max(0.3, Math.min(5, z))), [])

  const handleUndo = useCallback(async () => {
    const { state: newState, action } = undoAction(undoRedoState)
    if (!action) return; setUndoRedoState(newState)
    if (action.type === 'create') await deleteDrawingMeasurement(action.measurementId)
    else if (action.type === 'delete' && action.previousData) {
      const prev = action.previousData as Record<string, unknown>
      await createDrawingMeasurement({ drawing_id: prev.drawing_id as string, page_number: prev.page_number as number, scale_id: prev.scale_id as string | undefined, tool_type: prev.tool_type as string, coordinates: prev.coordinates, quantity: prev.quantity as number, unit: prev.unit as string | undefined, label: prev.label as string | undefined, color: prev.color as string | undefined })
    }
    await loadData()
  }, [undoRedoState, loadData])

  const handleRedo = useCallback(async () => {
    const { state: newState, action } = redoAction(undoRedoState)
    if (!action) return; setUndoRedoState(newState)
    if (action.type === 'create' && action.newData) {
      const nd = action.newData as Record<string, unknown>
      await createDrawingMeasurement({ drawing_id: nd.drawing_id as string, page_number: nd.page_number as number, scale_id: nd.scale_id as string | undefined, tool_type: nd.tool_type as string, coordinates: nd.coordinates, quantity: nd.quantity as number, unit: nd.unit as string | undefined, label: nd.label as string | undefined, color: nd.color as string | undefined })
    } else if (action.type === 'delete') await deleteDrawingMeasurement(action.measurementId)
    await loadData()
  }, [undoRedoState, loadData])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
      if (e.key === ' ') { isSpaceDown.current = true; e.preventDefault(); return }
      if (e.key === 'Shift') { isShiftDown.current = true; return }
      if (e.key === 'Escape') { setActivePoints([]); setIsCalibrating(false); setCalibrationPoints([]); return }
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeMeasurementId) { deleteDrawingMeasurement(activeMeasurementId).then(() => loadData()).catch((err) => console.error('Failed to delete measurement:', err)); setActiveMeasurementId(null); return }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || e.key === 'y') && (e.shiftKey || e.key === 'y')) { e.preventDefault(); handleRedo(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); return }
      const toolKey = TOOL_KEYS[e.key.toLowerCase()]
      if (toolKey && !e.ctrlKey && !e.metaKey) { setActiveTool(toolKey); setActivePoints([]); return }
      if (e.key === '=' || e.key === '+') handleZoomIn()
      if (e.key === '-' || e.key === '_') handleZoomOut()
      if (e.key === '0') handleFitToPage()
      if (e.key === 'Tab') { e.preventDefault(); setShowPanel(v => !v) }
      if (e.key === '?') setShowShortcuts(v => !v)
    }
    const up = (e: KeyboardEvent) => { if (e.key === ' ') isSpaceDown.current = false; if (e.key === 'Shift') isShiftDown.current = false }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [activeMeasurementId, loadData, handleZoomIn, handleZoomOut, handleFitToPage, handleUndo, handleRedo])

  const handleCalibConfirm = useCallback(async (realLength: number, unit: string) => {
    await createDrawingScale({ drawing_id: drawingId, page_number: 1, pt1_x: calibrationPoints[0].x, pt1_y: calibrationPoints[0].y, pt2_x: calibrationPoints[1].x, pt2_y: calibrationPoints[1].y, real_length: realLength, unit, px_per_unit: calibPixelDist / realLength })
    setShowCalibDialog(false); setIsCalibrating(false); setCalibrationPoints([]); await loadData()
  }, [drawingId, calibPixelDist, calibrationPoints, loadData])

  const handleToolChange = useCallback((tool: string | null) => { setActiveTool(tool as ToolType); setActivePoints([]); setIsCalibrating(false); setCalibrationPoints([]) }, [])
  const handleCalibrate = useCallback(() => { setIsCalibrating(v => !v); setCalibrationPoints([]); setActivePoints([]); if (!isCalibrating) setActiveTool(null) }, [isCalibrating])
  const handleDeleteMeasurement = useCallback(async (id: string) => {
    const m = measurements.find(m => m.id === id)
    if (m) setUndoRedoState(prev => pushAction(prev, { type: 'delete', measurementId: id, previousData: m }))
    await deleteDrawingMeasurement(id); if (activeMeasurementId === id) setActiveMeasurementId(null); await loadData()
  }, [activeMeasurementId, loadData, measurements])
  const handleLabelChange = useCallback(async (id: string, label: string) => { await updateDrawingMeasurement(id, { label }); await loadData() }, [loadData])

  const handleToggleLinkMode = useCallback(() => { setLinkMode(v => !v); setSelectedForLink([]); if (!linkMode) setPanelTab('boq') }, [linkMode])
  const handleToggleMeasurementForLink = useCallback((id: string) => { setSelectedForLink(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) }, [])
  const handleLinkToItem = useCallback(async (boqItemId: string) => {
    if (selectedForLink.length === 0) return; await linkDrawingMeasurementsToBOQ(boqItemId, selectedForLink, projectId); setSelectedForLink([]); setLinkMode(false); await loadData()
  }, [selectedForLink, projectId, loadData])
  const handleCreateAndLink = useCallback(async (description: string, unit: string) => {
    if (selectedForLink.length === 0) return; const result = await createBOQItem({ project_id: projectId, description, unit })
    if (result.data) await linkDrawingMeasurementsToBOQ(result.data.id, selectedForLink, projectId); setSelectedForLink([]); setLinkMode(false); await loadData()
  }, [selectedForLink, projectId, loadData])
  const handleOpenBOQPicker = useCallback((ids: string[]) => { if (ids.length === 0) return; setBOQPickerIds(ids); setShowBOQPicker(true) }, [])
  const handleBOQPickerLinked = useCallback(async () => { setBOQPickerIds([]); setShowBOQPicker(false); setSelectedForLink([]); setLinkMode(false); await loadData() }, [loadData])
  const handleBOQItemSelect = useCallback((boqItemId: string | null, linkedDmIds: string[]) => {
    if (boqItemId && linkedDmIds.length > 0) { setActiveBOQItemId(boqItemId); setHighlightedMeasurementIds(new Set(linkedDmIds)) }
    else { setActiveBOQItemId(null); setHighlightedMeasurementIds(new Set()) }
  }, [])

  let cursor = 'default'
  if (activeTool === 'pan' || isPanning.current || isSpaceDown.current) cursor = 'grab'
  if (DRAWING_TOOLS.includes(activeTool ?? '') || isCalibrating) cursor = 'crosshair'
  if (activeTool === 'select') cursor = 'default'

  const takeoffMs: TakeoffMeasurement[] = useMemo(() => measurements.map(m => ({
    id: m.id, tool_type: m.tool_type, coordinates: m.coordinates,
    quantity: m.quantity, unit: m.unit, color: m.color, label: m.label,
  })), [measurements])

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

      {!scale && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm">
          <AlertTriangle size={16} /><span>Calibrate scale to get real measurements. Currently showing pixel units.</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative overflow-hidden bg-[var(--color-surface)] dark:bg-[var(--color-surface)]">
          <ZoomControls zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onFitToPage={handleFitToPage} onZoomSet={handleZoomSet} />

          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <button onClick={() => setShowShortcuts(true)} className="p-1.5 bg-white/90 dark:bg-[var(--color-surface-elevated)]/90 backdrop-blur rounded-lg shadow-sm hover:bg-white dark:hover:bg-[var(--color-surface-elevated)] transition-colors text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]" title="Keyboard shortcuts (?)"><Keyboard size={16} /></button>
            <button onClick={() => setShowPanel(v => !v)} className="p-1.5 bg-white/90 dark:bg-[var(--color-surface-elevated)]/90 backdrop-blur rounded-lg shadow-sm hover:bg-white dark:hover:bg-[var(--color-surface-elevated)] transition-colors text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]" title={showPanel ? 'Hide panel (Tab)' : 'Show panel (Tab)'}>
              {showPanel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </button>
          </div>

          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-3 bg-white/95 dark:bg-[var(--color-surface-elevated)]/95 backdrop-blur rounded-lg shadow-lg border border-[var(--color-border)] dark:border-[var(--color-border)] px-3 py-1.5 text-[11px] text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">
            {activeTool && (<><span className="font-medium text-[var(--color-text)]">{TOOL_LABELS[activeTool] ?? activeTool}</span><span className="text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">|</span></>)}
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Image</span>
            <span className="text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]">|</span>
            <span>{measurements.length} measurement{measurements.length !== 1 ? 's' : ''}</span>
          </div>

          <div ref={containerRef} className="w-full h-full overflow-hidden" style={{ cursor }}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin h-8 w-8 border-4 border-[var(--color-amber-cta)] border-t-transparent rounded-full" />
                  <p className="text-xs text-[var(--color-text-muted)]">Loading image...</p>
                </div>
              </div>
            ) : imgError ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3 text-center px-6">
                  <AlertTriangle size={28} className="text-amber-500" />
                  <p className="text-sm font-medium text-[var(--color-text)]">Failed to load image</p>
                  <p className="text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] max-w-sm">{imgError}</p>
                </div>
              </div>
            ) : (
              <div style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, transformOrigin: '0 0', position: 'relative', width: canvasSize.width, height: canvasSize.height }}>
                <canvas ref={imgCanvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
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

        {showPanel && (
          <>
            <div className="w-1 flex-shrink-0 cursor-col-resize bg-[var(--color-surface)] dark:bg-[var(--color-surface-hover)] hover:bg-[var(--color-amber-cta)] dark:hover:bg-[var(--color-amber-cta)] active:bg-[var(--color-amber-cta)] transition-colors relative group"
              onMouseDown={(e) => {
                e.preventDefault(); panelDragRef.current = { startX: e.clientX, startW: panelWidth }
                const onMove = (ev: MouseEvent) => { if (!panelDragRef.current) return; setPanelWidth(Math.max(240, Math.min(600, panelDragRef.current.startW + (panelDragRef.current.startX - ev.clientX)))) }
                const onUp = () => { panelDragRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.body.style.cursor = ''; document.body.style.userSelect = '' }
                document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'
                document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
              }}
            ><div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-[var(--color-surface)] dark:bg-[var(--color-surface-hover)] group-hover:bg-[var(--color-amber-cta)] transition-colors" /></div>
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
                      <><button onClick={() => handleOpenBOQPicker(selectedForLink)} className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors">Link ({selectedForLink.length})</button>
                      <button onClick={() => { setSelectedForLink([]); setLinkMode(false) }} className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-[var(--color-text-secondary)] px-0.5">x</button></>
                    )}
                    <button onClick={() => setPanelTab(panelTab === 'scales' ? 'measurements' : 'scales')} className={cn('px-2 py-0.5 rounded text-[10px] font-medium transition-colors', panelTab === 'scales' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]')}>Scales</button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {panelTab === 'scales' ? (
                    <div className="p-2"><ScaleManager drawingId={drawingId} currentPage={1} activeScale={scale} scales={allScales} onScaleSelect={setScale} onCalibrate={handleCalibrate} onScaleDelete={() => {}} onRefresh={loadData} /></div>
                  ) : (
                    <MeasurementList measurements={takeoffMs} activeMeasurementId={activeMeasurementId}
                      onSelect={(id) => { if (linkMode) handleToggleMeasurementForLink(id); else setActiveMeasurementId(id) }}
                      onDelete={handleDeleteMeasurement} onLabelChange={handleLabelChange} onLinkToBOQ={handleOpenBOQPicker}
                      selectedIds={linkMode ? selectedForLink : undefined} />
                  )}
                </div>
              </div>
              <div className="h-px bg-[var(--color-surface)] dark:bg-[var(--color-surface-hover)] shrink-0" />
              <div className="flex-1 min-h-0 flex flex-col">
                <LiveBOQPanel projectId={projectId} drawingId={drawingId} measurementCount={measurements.length}
                  linkMode={linkMode && selectedForLink.length > 0} selectedMeasurementIds={selectedForLink}
                  onLinkToItem={handleLinkToItem} onCreateAndLink={handleCreateAndLink}
                  activeBOQItemId={activeBOQItemId} onBOQItemSelect={handleBOQItemSelect}
                  highlightedBOQItemId={null} selectedDrawingMeasurementId={activeMeasurementId} />
              </div>
            </div>
          </>
        )}
      </div>

      <CalibrationDialog isOpen={showCalibDialog} onClose={() => { setShowCalibDialog(false); setIsCalibrating(false); setCalibrationPoints([]) }} onConfirm={handleCalibConfirm} pixelDistance={calibPixelDist} />
      <KeyboardShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <VolumeCalculator
        isOpen={showVolumeCalc}
        onClose={() => setShowVolumeCalc(false)}
        onAddMeasurement={handleAddVolumeMeasurement}
        drawingMeasurements={takeoffMs.map(m => ({ id: m.id, label: m.label ?? '', quantity: m.quantity, unit: m.unit ?? 'px' }))}
      />

      <AISuggestionsPanel
        isOpen={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        isAnalyzing={isAIAnalyzing}
        result={aiResult}
        onAnalyze={handleAIAnalyze}
        onApproveElement={handleAIApproveElement}
        onApproveBOQItem={handleAIApproveBOQItem}
        onApproveAll={handleAIApproveAll}
        onHighlightElement={() => {}}
        onEstimateCosts={handleEstimateCosts}
        isEstimatingCosts={isEstimatingCosts}
      />
      <BOQPicker isOpen={showBOQPicker} onClose={() => { setShowBOQPicker(false); setBOQPickerIds([]) }} projectId={projectId} drawingMeasurementIds={boqPickerIds} onLinked={handleBOQPickerLinked} />
    </div>
  )
}
