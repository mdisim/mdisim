'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  Ruler, Square, Hash, Highlighter, Type, MousePointer,
  Move, Crosshair, Layers, Trash2, Download, Link2, AlertCircle, Check
} from 'lucide-react'
import { DrawingFile, DrawingCalibration, DrawingMeasurement, BOQItem, MeasurementType, ToolType, Point, DrawingLayer } from '@/lib/types'
import { saveMeasurement, deleteMeasurement, updateMeasurement, saveCalibration, generateBOQQuantities, createLayer, updateLayer, deleteLayer, getLayers } from '@/app/actions/takeoff'
import { formatDate } from '@/lib/utils'

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────
interface LiveMeasurement {
  id: string
  type: MeasurementType
  points: Point[]
  color: string
  label: string
  real_value: number | null
  unit: string
  boq_item_id: string | null
  page_number: number
}

const TOOL_COLORS: Record<string, string> = {
  length: '#ef4444',
  area: '#3b82f6',
  rectangle: '#8b5cf6',
  count: '#10b981',
  highlight: 'rgba(251,191,36,0.35)',
  text: '#0f172a',
  calibrate: '#f59e0b',
}

const MEASUREMENT_COLORS = [
  '#ef4444', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

// Preset templates: quick-start configurations per trade/discipline
const MEASUREMENT_TEMPLATES: { id: string; name: string; emoji: string; tool: MeasurementType; color: string; unit: string; label: string }[] = [
  { id: 'wall-length',   name: 'Wall Length',    emoji: '🧱', tool: 'length',    color: '#ef4444', unit: 'm',  label: 'Wall' },
  { id: 'floor-area',   name: 'Floor Area',     emoji: '⬜', tool: 'area',      color: '#3b82f6', unit: 'm²', label: 'Floor' },
  { id: 'concrete-vol', name: 'Concrete',       emoji: '🏗️', tool: 'rectangle', color: '#6b7280', unit: 'm²', label: 'Concrete' },
  { id: 'tile-area',    name: 'Tiling',         emoji: '🔲', tool: 'area',      color: '#8b5cf6', unit: 'm²', label: 'Tile' },
  { id: 'paint-area',   name: 'Paint',          emoji: '🎨', tool: 'rectangle', color: '#10b981', unit: 'm²', label: 'Paint' },
  { id: 'steel-length', name: 'Steel / Rebar',  emoji: '⚙️', tool: 'length',    color: '#f97316', unit: 'm',  label: 'Steel' },
  { id: 'count-item',   name: 'Count Items',    emoji: '🔢', tool: 'count',     color: '#06b6d4', unit: 'nr', label: '' },
  { id: 'highlight',    name: 'Highlight',      emoji: '🖍️', tool: 'highlight', color: 'rgba(251,191,36,0.35)', unit: '', label: '' },
]

const DISCIPLINE_COLORS: Record<string, string> = {
  architectural: '#3b82f6',
  structural:    '#ef4444',
  mep:           '#10b981',
  civil:         '#f97316',
  general:       '#6366f1',
}

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

function pointInPolygon(pt: Point, poly: Point[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y
    const xj = poly[j].x, yj = poly[j].y
    if (((yi > pt.y) !== (yj > pt.y)) && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function distToSegment(p: Point, a: Point, b: Point) {
  const ab = { x: b.x - a.x, y: b.y - a.y }
  const ap = { x: p.x - a.x, y: p.y - a.y }
  const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y) / (ab.x ** 2 + ab.y ** 2)))
  return dist(p, { x: a.x + t * ab.x, y: a.y + t * ab.y })
}

function hitTest(p: Point, m: LiveMeasurement, threshold = 10): boolean {
  if (m.type === 'count' || m.type === 'text') {
    return m.points.some(pt => dist(p, pt) < threshold * 2)
  }
  if (m.type === 'area' || m.type === 'rectangle') {
    if (m.points.length >= 3) return pointInPolygon(p, m.points)
  }
  if (m.type === 'length' || m.type === 'highlight') {
    for (let i = 1; i < m.points.length; i++) {
      if (distToSegment(p, m.points[i - 1], m.points[i]) < threshold) return true
    }
  }
  return false
}

// ────────────────────────────────────────────
// Props
// ────────────────────────────────────────────
interface Props {
  drawing: DrawingFile
  projectId: string
  pdfUrl: string
  initialCalibrations: DrawingCalibration[]
  initialMeasurements: DrawingMeasurement[]
  boqItems: BOQItem[]
}

// ────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────
export function TakeoffViewer({ drawing, projectId, pdfUrl, initialCalibrations, initialMeasurements, boqItems }: Props) {
  // PDF state
  const [pdfDoc, setPdfDoc] = useState<import('pdfjs-dist').PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [pdfLoading, setPdfLoading] = useState(true)
  const [pdfError, setPdfError] = useState<string | null>(null)

  // Tool state
  const [tool, setTool] = useState<ToolType>('select')
  const [selectedColor, setSelectedColor] = useState(MEASUREMENT_COLORS[0])

  // Measurement state
  const [measurements, setMeasurements] = useState<LiveMeasurement[]>(
    initialMeasurements.map(m => ({
      id: m.id,
      type: m.measurement_type,
      points: m.points,
      color: m.color,
      label: m.label ?? '',
      real_value: m.real_value,
      unit: m.unit ?? 'm',
      boq_item_id: m.boq_item_id,
      page_number: m.page_number,
    }))
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawing_state, setDrawingState] = useState<Point[]>([])
  const [mousePos, setMousePos] = useState<Point | null>(null)

  // Calibration state
  const [calibrations, setCalibrations] = useState<Record<number, DrawingCalibration>>(
    Object.fromEntries(initialCalibrations.map(c => [c.page_number, c]))
  )
  const [calibrating, setCalibrating] = useState(false)
  const [calibPoints, setCalibPoints] = useState<Point[]>([])
  const [calibInput, setCalibInput] = useState('')
  const [calibUnit, setCalibUnit] = useState('m')
  const [showCalibDialog, setShowCalibDialog] = useState(false)
  const [pendingCalibPx, setPendingCalibPx] = useState(0)

  // Panel state
  const [activeTab, setActiveTab] = useState<'measurements' | 'layers' | 'properties'>('measurements')
  const [saving, setSaving] = useState<string | null>(null)
  const [generatingBOQ, setGeneratingBOQ] = useState(false)
  const [boqResult, setBoqResult] = useState<string | null>(null)

  // Layer state
  const [layers, setLayers] = useState<DrawingLayer[]>([])
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const [newLayerName, setNewLayerName] = useState('')
  const [newLayerDiscipline, setNewLayerDiscipline] = useState('general')
  const [showLayerForm, setShowLayerForm] = useState(false)

  // Template state
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  // Refs
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const calib = calibrations[currentPage]
  const scaleFactor = calib?.scale_factor ?? null
  const scaleUnit = calib?.real_unit ?? 'm'
  const pageMeasurements = measurements.filter(m => m.page_number === currentPage)
  const selected = measurements.find(m => m.id === selectedId) ?? null

  // ────────────────────────────
  // Load layers on mount
  // ────────────────────────────
  useEffect(() => {
    getLayers(drawing.id).then(r => { if (r.layers) setLayers(r.layers as DrawingLayer[]) })
  }, [drawing.id])

  // ────────────────────────────
  // Load PDF
  // ────────────────────────────
  useEffect(() => {
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
  }, [pdfUrl])

  // ────────────────────────────
  // Render PDF page
  // ────────────────────────────
  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current) return
    let cancelled = false
    ;(async () => {
      const page = await pdfDoc.getPage(currentPage)
      if (cancelled) return
      const viewport = page.getViewport({ scale: zoom })
      const canvas = pdfCanvasRef.current!
      const ctx = canvas.getContext('2d')!
      canvas.width = viewport.width
      canvas.height = viewport.height
      if (overlayRef.current) {
        overlayRef.current.width = viewport.width
        overlayRef.current.height = viewport.height
      }
      await page.render({ canvasContext: ctx, viewport, canvas: canvas }).promise
    })()
    return () => { cancelled = true }
  }, [pdfDoc, currentPage, zoom])

  // ────────────────────────────
  // Render measurements overlay
  // ────────────────────────────
  useEffect(() => {
    const canvas = overlayRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw saved measurements
    for (const m of pageMeasurements) {
      drawMeasurement(ctx, m, m.id === selectedId)
    }

    // Draw in-progress
    if (drawing_state.length > 0 && mousePos) {
      const preview: LiveMeasurement = {
        id: '__preview',
        type: tool === 'calibrate' ? 'length' : tool as MeasurementType,
        points: [...drawing_state, mousePos],
        color: tool === 'calibrate' ? TOOL_COLORS.calibrate : selectedColor,
        label: '',
        real_value: null,
        unit: scaleUnit,
        boq_item_id: null,
        page_number: currentPage,
      }
      drawMeasurement(ctx, preview, false, true)
    }
  }, [pageMeasurements, drawing_state, mousePos, selectedId, tool, selectedColor])

  function drawMeasurement(ctx: CanvasRenderingContext2D, m: LiveMeasurement, selected: boolean, preview = false) {
    if (!m.points.length) return
    ctx.save()
    const color = m.color

    if (m.type === 'highlight') {
      ctx.fillStyle = preview ? 'rgba(251,191,36,0.25)' : 'rgba(251,191,36,0.30)'
      if (m.points.length >= 2) {
        const [a, b] = [m.points[0], m.points[m.points.length - 1]]
        ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y))
        ctx.strokeStyle = 'rgba(251,191,36,0.7)'
        ctx.lineWidth = 1
        ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y))
      }
    } else if (m.type === 'count') {
      for (const pt of m.points) {
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, selected ? 8 : 6, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
      }
      if (m.points.length > 0) {
        const last = m.points[0]
        ctx.fillStyle = '#1e293b'
        ctx.font = `bold 11px system-ui`
        ctx.fillText(`×${m.points.length}`, last.x + 10, last.y - 8)
      }
    } else if (m.type === 'text') {
      for (const pt of m.points) {
        ctx.fillStyle = color
        ctx.font = `bold 13px system-ui`
        ctx.fillText(m.label || 'Label', pt.x, pt.y)
      }
    } else {
      // Line / area / rectangle
      const pts = m.type === 'rectangle' && m.points.length === 2
        ? rectPoints(m.points[0], m.points[m.points.length - 1])
        : m.points

      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)

      if (m.type === 'area' || m.type === 'rectangle') {
        ctx.closePath()
        ctx.fillStyle = color.replace(')', ', 0.12)').replace('rgb', 'rgba')
        ctx.fill()
      }

      ctx.strokeStyle = selected ? '#f59e0b' : color
      ctx.lineWidth = selected ? 3 : 2
      ctx.setLineDash(preview ? [5, 5] : [])
      ctx.stroke()
      ctx.setLineDash([])

      // Length label
      if ((m.type === 'length' || m.type === 'area' || m.type === 'rectangle') && m.real_value !== null && !preview) {
        const mid = pts[Math.floor(pts.length / 2)]
        const label = m.real_value.toFixed(m.type === 'length' ? 2 : 2) + ' ' + m.unit
        ctx.font = '11px system-ui'
        const tw = ctx.measureText(label).width
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.fillRect(mid.x - tw / 2 - 3, mid.y - 14, tw + 6, 16)
        ctx.fillStyle = '#0f172a'
        ctx.fillText(label, mid.x - tw / 2, mid.y - 2)
      }
    }

    // Selection handle
    if (selected && m.points.length > 0) {
      for (const pt of m.points) {
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#f59e0b'
        ctx.fill()
      }
    }

    ctx.restore()
  }

  function rectPoints(a: Point, b: Point): Point[] {
    return [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }]
  }

  // ────────────────────────────
  // Compute real value from points
  // ────────────────────────────
  function computeValue(type: MeasurementType, pts: Point[]): number | null {
    if (!scaleFactor) return null
    const pxToReal = (px: number) => px / scaleFactor
    if (type === 'length') return pxToReal(polylineLength(pts))
    if (type === 'area') return pxToReal(pxToReal(polygonArea(pts)))
    if (type === 'rectangle') {
      if (pts.length < 2) return null
      const [a, b] = [pts[0], pts[pts.length - 1]]
      const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y)
      return pxToReal(w) * pxToReal(h)
    }
    if (type === 'count') return pts.length
    return null
  }

  // ────────────────────────────
  // Canvas event handlers
  // ────────────────────────────
  function canvasPoint(e: React.MouseEvent<HTMLCanvasElement>): Point {
    const rect = overlayRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setMousePos(canvasPoint(e))
  }, [])

  const handleMouseLeave = useCallback(() => setMousePos(null), [])

  const handleClick = useCallback(async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = canvasPoint(e)

    // Calibration
    if (tool === 'calibrate') {
      const next = [...calibPoints, pt]
      setCalibPoints(next)
      if (next.length === 2) {
        const px = dist(next[0], next[1])
        setPendingCalibPx(px)
        setShowCalibDialog(true)
        setCalibPoints([])
        setDrawingState([])
      } else {
        setDrawingState(next)
      }
      return
    }

    // Select tool — hit test
    if (tool === 'select') {
      const hit = [...pageMeasurements].reverse().find(m => hitTest(pt, m))
      setSelectedId(hit?.id ?? null)
      return
    }

    // Count tool — each click adds a pin, double-click saves
    if (tool === 'count') {
      if (e.detail === 2 && drawing_state.length > 0) {
        await finalizeWithTemplate('count', drawing_state)
        setDrawingState([])
        return
      }
      setDrawingState(prev => [...prev, pt])
      return
    }

    // Text tool — single click places label
    if (tool === 'text') {
      const label = prompt('Enter label text:')
      if (label) await finalizeWithTemplate('text', [pt], label)
      return
    }

    // Area / polygon — double-click to close
    if (tool === 'area') {
      if (e.detail === 2 && drawing_state.length >= 2) {
        await finalizeWithTemplate('area', drawing_state)
        setDrawingState([])
        return
      }
      setDrawingState(prev => [...prev, pt])
      return
    }

    // Length — double-click to end
    if (tool === 'length') {
      if (e.detail === 2 && drawing_state.length >= 1) {
        await finalizeWithTemplate('length', drawing_state)
        setDrawingState([])
        return
      }
      setDrawingState(prev => [...prev, pt])
      return
    }
  }, [tool, drawing_state, calibPoints, pageMeasurements, activeTemplateId])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'rectangle' || tool === 'highlight') {
      setDrawingState([canvasPoint(e)])
    }
  }, [tool])

  const handleMouseUp = useCallback(async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if ((tool === 'rectangle' || tool === 'highlight') && drawing_state.length === 1) {
      const end = canvasPoint(e)
      const pts = [drawing_state[0], end]
      if (dist(pts[0], pts[1]) > 5) {
        await finalizeWithTemplate(tool as MeasurementType, pts)
      }
      setDrawingState([])
    }
  }, [tool, drawing_state, activeTemplateId])

  async function finalizeWithTemplate(type: MeasurementType, pts: Point[], label = '') {
    const tpl = activeTemplateId ? MEASUREMENT_TEMPLATES.find(t => t.id === activeTemplateId) : null
    await finalizeMeasurement(type, pts, tpl?.label ?? label, tpl?.color, tpl?.unit || undefined)
  }

  async function finalizeMeasurement(type: MeasurementType, pts: Point[], label = '', overrideColor?: string, overrideUnit?: string) {
    const realVal = computeValue(type, pts)
    const unitLabel = overrideUnit ?? (type === 'count' ? 'nr' : type === 'area' || type === 'rectangle' ? scaleUnit + '²' : scaleUnit)
    const color = overrideColor ?? TOOL_COLORS[type] ?? selectedColor

    const local: LiveMeasurement = {
      id: crypto.randomUUID(),
      type,
      points: pts,
      color,
      label,
      real_value: realVal,
      unit: unitLabel,
      boq_item_id: null,
      page_number: currentPage,
    }
    setMeasurements(prev => [...prev, local])

    setSaving(local.id)
    const result = await saveMeasurement({
      drawing_id: drawing.id,
      page_number: currentPage,
      label: label || null,
      measurement_type: type,
      points: pts,
      color,
      real_value: realVal,
      unit: unitLabel,
      layer_id: activeLayerId,
    } as Parameters<typeof saveMeasurement>[0] & { layer_id?: string | null })
    setSaving(null)

    if (result.measurement) {
      setMeasurements(prev => prev.map(m => m.id === local.id ? { ...local, id: result.measurement.id } : m))
      setSelectedId(result.measurement.id)
    }
  }

  // ────────────────────────────
  // Save calibration
  // ────────────────────────────
  async function handleSaveCalibration() {
    const real = parseFloat(calibInput)
    if (!real || real <= 0) return
    const factor = pendingCalibPx / real
    const calib: DrawingCalibration = {
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
    setCalibrations(prev => ({ ...prev, [currentPage]: calib }))
    await saveCalibration(drawing.id, currentPage, {
      pixels_distance: pendingCalibPx,
      real_distance: real,
      real_unit: calibUnit,
      scale_factor: factor,
    })
    setShowCalibDialog(false)
    setCalibInput('')
    setTool('select')
    // Re-compute existing measurements
    setMeasurements(prev => prev.map(m => {
      if (m.page_number !== currentPage) return m
      const realVal = computeValueWithFactor(m.type, m.points, factor)
      const unitLabel = m.type === 'count' ? 'nr' : m.type === 'area' || m.type === 'rectangle' ? calibUnit + '²' : calibUnit
      return { ...m, real_value: realVal, unit: unitLabel }
    }))
  }

  function computeValueWithFactor(type: MeasurementType, pts: Point[], factor: number): number | null {
    const pxToReal = (px: number) => px / factor
    if (type === 'length') return pxToReal(polylineLength(pts))
    if (type === 'area') return pxToReal(pxToReal(polygonArea(pts)))
    if (type === 'rectangle') {
      if (pts.length < 2) return null
      const [a, b] = [pts[0], pts[pts.length - 1]]
      return pxToReal(Math.abs(b.x - a.x)) * pxToReal(Math.abs(b.y - a.y))
    }
    if (type === 'count') return pts.length
    return null
  }

  // ────────────────────────────
  // Delete measurement
  // ────────────────────────────
  async function handleDeleteMeasurement(id: string) {
    setMeasurements(prev => prev.filter(m => m.id !== id))
    if (selectedId === id) setSelectedId(null)
    await deleteMeasurement(id)
  }

  // ────────────────────────────
  // Link to BOQ
  // ────────────────────────────
  async function handleLinkBOQ(boqItemId: string) {
    if (!selectedId) return
    setMeasurements(prev => prev.map(m => m.id === selectedId ? { ...m, boq_item_id: boqItemId } : m))
    await updateMeasurement(selectedId, { boq_item_id: boqItemId || null })
  }

  // ────────────────────────────
  // Layer handlers
  // ────────────────────────────
  async function handleCreateLayer() {
    if (!newLayerName.trim()) return
    const color = DISCIPLINE_COLORS[newLayerDiscipline] ?? '#6366f1'
    const result = await createLayer(drawing.id, { name: newLayerName.trim(), discipline: newLayerDiscipline, color })
    if (result.layer) {
      setLayers(prev => [...prev, result.layer as DrawingLayer])
      setActiveLayerId(result.layer.id)
    }
    setNewLayerName('')
    setShowLayerForm(false)
  }

  async function handleToggleLayerVisibility(layer: DrawingLayer) {
    const updated = { ...layer, is_visible: !layer.is_visible }
    setLayers(prev => prev.map(l => l.id === layer.id ? updated : l))
    await updateLayer(layer.id, { is_visible: !layer.is_visible })
  }

  async function handleDeleteLayer(layerId: string) {
    if (!confirm('Delete this layer? Measurements will be unassigned.')) return
    setLayers(prev => prev.filter(l => l.id !== layerId))
    if (activeLayerId === layerId) setActiveLayerId(null)
    await deleteLayer(layerId)
  }

  // ────────────────────────────
  // Generate BOQ quantities
  // ────────────────────────────
  async function handleGenerateBOQ() {
    setGeneratingBOQ(true)
    setBoqResult(null)
    const result = await generateBOQQuantities(drawing.id, projectId)
    setGeneratingBOQ(false)
    setBoqResult(result.error ? `Error: ${result.error}` : `Updated ${result.updated} BOQ item${result.updated !== 1 ? 's' : ''}`)
  }

  // ────────────────────────────
  // Keyboard shortcuts
  // ────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape') { setDrawingState([]); setTool('select') }
      if (e.key === 'Delete' && selectedId) handleDeleteMeasurement(selectedId)
      if (e.key === 's') setTool('select')
      if (e.key === 'l') setTool('length')
      if (e.key === 'a') setTool('area')
      if (e.key === 'r') setTool('rectangle')
      if (e.key === 'c') setTool('count')
      if (e.key === 'h') setTool('highlight')
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.25, 4))
      if (e.key === '-') setZoom(z => Math.max(z - 0.25, 0.25))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId])

  // ────────────────────────────
  // Toolbar definition
  // ────────────────────────────
  const tools: { id: ToolType; icon: React.ReactNode; label: string; key: string }[] = [
    { id: 'select', icon: <MousePointer size={16} />, label: 'Select (S)', key: 'S' },
    { id: 'calibrate', icon: <Crosshair size={16} />, label: 'Calibrate Scale', key: '' },
    { id: 'length', icon: <Ruler size={16} />, label: 'Length (L)', key: 'L' },
    { id: 'area', icon: <Layers size={16} />, label: 'Area / Polygon (A)', key: 'A' },
    { id: 'rectangle', icon: <Square size={16} />, label: 'Rectangle (R)', key: 'R' },
    { id: 'count', icon: <Hash size={16} />, label: 'Count (C)', key: 'C' },
    { id: 'highlight', icon: <Highlighter size={16} />, label: 'Highlight (H)', key: 'H' },
    { id: 'text', icon: <Type size={16} />, label: 'Text Label', key: '' },
  ]

  const cursorStyle: Record<string, string> = {
    select: 'default',
    calibrate: 'crosshair',
    length: 'crosshair',
    area: 'crosshair',
    rectangle: 'crosshair',
    count: 'cell',
    highlight: 'crosshair',
    text: 'text',
    pan: 'grab',
  }

  // ────────────────────────────
  // Render
  // ────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden -m-4 md:-m-6">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <Link href={`/projects/${projectId}/takeoff`} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={15} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{drawing.name}</p>
          <p className="text-slate-500 text-xs">{drawing.original_filename}</p>
        </div>

        {/* Calibration status */}
        <div className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${calib ? 'bg-green-900/50 text-green-400' : 'bg-amber-900/50 text-amber-400'}`}>
          {calib ? <Check size={11} /> : <AlertCircle size={11} />}
          {calib ? `1 ${calib.real_unit} = ${(calib.pixels_distance).toFixed(0)}px` : 'Not calibrated'}
        </div>

        {/* Generate BOQ button */}
        <button
          onClick={handleGenerateBOQ}
          disabled={generatingBOQ}
          className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <Link2 size={12} />
          {generatingBOQ ? 'Generating…' : 'Push to BOQ'}
        </button>

        {boqResult && (
          <span className="text-xs text-green-400 hidden sm:block">{boqResult}</span>
        )}

        {/* Page navigation */}
        {drawing.page_count > 1 && (
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-40"><ChevronLeft size={14} /></button>
            <span className="text-xs">{currentPage}/{drawing.page_count}</span>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, drawing.page_count))} disabled={currentPage === drawing.page_count}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-40"><ChevronRight size={14} /></button>
          </div>
        )}

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"><ZoomOut size={14} /></button>
          <span className="text-xs text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(z + 0.25, 4))} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"><ZoomIn size={14} /></button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left toolbar ── */}
        <div className="flex flex-col gap-1 p-2 bg-slate-900 border-r border-slate-800 shrink-0 overflow-y-auto">
          {tools.map(t => (
            <button
              key={t.id}
              title={t.label}
              onClick={() => { setTool(t.id); setDrawingState([]); setActiveTemplateId(null) }}
              className={`p-2.5 rounded-lg transition-all ${tool === t.id && !activeTemplateId
                ? 'bg-amber-500 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              {t.icon}
            </button>
          ))}

          <div className="border-t border-slate-800 mt-1 pt-1">
            <button
              title="Measurement Templates"
              onClick={() => setShowTemplates(s => !s)}
              className={`w-full p-1.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1 ${showTemplates ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}
            >
              <span>📋</span>
            </button>
          </div>

          {showTemplates && (
            <div className="space-y-0.5">
              {MEASUREMENT_TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  title={tpl.name}
                  onClick={() => {
                    setActiveTemplateId(tpl.id)
                    setTool(tpl.tool)
                    setSelectedColor(tpl.color.startsWith('rgba') ? MEASUREMENT_COLORS[4] : tpl.color)
                    setDrawingState([])
                  }}
                  className={`w-full p-1.5 rounded text-xs transition-all flex items-center gap-1 ${activeTemplateId === tpl.id
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-700'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'}`}
                >
                  <span>{tpl.emoji}</span>
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-slate-800 mt-1 pt-1">
            <p className="text-xs text-slate-600 text-center mb-1">Color</p>
            <div className="grid grid-cols-2 gap-1">
              {MEASUREMENT_COLORS.slice(0, 6).map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${selectedColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── PDF canvas area ── */}
        <div className="flex-1 overflow-auto bg-slate-800" ref={containerRef}>
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
                <p className="text-slate-500 text-xs mt-3">Check that your Supabase Storage bucket is configured and the file was uploaded correctly.</p>
              </div>
            </div>
          )}
          {!pdfLoading && !pdfError && (
            <div className="inline-block m-4 relative shadow-2xl">
              <canvas ref={pdfCanvasRef} className="block bg-white" style={{ imageRendering: 'crisp-edges' }} />
              <canvas
                ref={overlayRef}
                className="absolute inset-0 block"
                style={{ cursor: cursorStyle[tool] ?? 'crosshair' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
              />
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div className="w-64 shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden">
          {/* Panel tabs */}
          <div className="flex border-b border-slate-800">
            {(['measurements', 'layers', 'properties'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 text-xs py-2.5 font-medium transition-colors capitalize ${activeTab === tab ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {tab === 'measurements' ? '≡' : tab === 'layers' ? '⊟' : '⊞'}
              </button>
            ))}
          </div>

          {activeTab === 'measurements' ? (
            /* Measurements list */
            <div className="flex-1 overflow-y-auto">
              {pageMeasurements.length === 0 ? (
                <div className="p-4 text-center">
                  <Ruler size={24} className="mx-auto mb-2 text-slate-600" />
                  <p className="text-xs text-slate-500">No measurements on this page</p>
                  <p className="text-xs text-slate-600 mt-1">Select a tool and start measuring</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {pageMeasurements.map(m => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedId(m.id === selectedId ? null : m.id)}
                      className={`p-3 cursor-pointer transition-colors ${m.id === selectedId ? 'bg-amber-500/10' : 'hover:bg-slate-800/50'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                          <span className="text-xs font-medium text-slate-300 capitalize">{m.type}</span>
                          {saving === m.id && <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />}
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteMeasurement(m.id) }}
                          className="p-0.5 rounded hover:bg-red-900/50 text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      {m.label && <p className="text-xs text-slate-400 mb-0.5">{m.label}</p>}
                      {m.real_value !== null && (
                        <p className="text-sm font-semibold text-white">
                          {m.real_value.toFixed(m.type === 'count' ? 0 : 3)} {m.unit}
                        </p>
                      )}
                      {m.boq_item_id && (
                        <p className="text-xs text-amber-400 mt-0.5">
                          {boqItems.find(b => b.id === m.boq_item_id)?.item_code ?? '—'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Page summary */}
              {pageMeasurements.length > 0 && (
                <div className="p-3 border-t border-slate-800">
                  {(['length', 'area', 'rectangle'] as MeasurementType[]).map(type => {
                    const items = pageMeasurements.filter(m => m.type === type && m.real_value !== null)
                    if (!items.length) return null
                    const total = items.reduce((s, m) => s + (m.real_value ?? 0), 0)
                    return (
                      <div key={type} className="flex justify-between text-xs py-0.5">
                        <span className="text-slate-500 capitalize">{type} total:</span>
                        <span className="text-slate-300 font-medium">{total.toFixed(2)} {items[0].unit}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : activeTab === 'layers' ? (
            /* Layers panel */
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Drawing Layers</p>
                <button
                  onClick={() => setShowLayerForm(s => !s)}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                >+ Add</button>
              </div>

              {showLayerForm && (
                <div className="bg-slate-800 rounded-lg p-3 space-y-2">
                  <input
                    value={newLayerName}
                    onChange={e => setNewLayerName(e.target.value)}
                    placeholder="Layer name…"
                    className="w-full text-xs bg-slate-700 border border-slate-600 text-white rounded px-2 py-1.5 focus:outline-none focus:border-amber-500"
                  />
                  <select
                    value={newLayerDiscipline}
                    onChange={e => setNewLayerDiscipline(e.target.value)}
                    className="w-full text-xs bg-slate-700 border border-slate-600 text-white rounded px-2 py-1.5"
                  >
                    {Object.keys(DISCIPLINE_COLORS).map(d => (
                      <option key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleCreateLayer}
                    className="w-full text-xs bg-amber-500 hover:bg-amber-400 text-white rounded py-1.5 transition-colors"
                  >Create Layer</button>
                </div>
              )}

              {layers.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-4">No layers yet. Create one to organise measurements by discipline.</p>
              ) : (
                <div className="space-y-1">
                  <div
                    onClick={() => setActiveLayerId(null)}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${activeLayerId === null ? 'bg-amber-500/10 border border-amber-800' : 'hover:bg-slate-800 border border-transparent'}`}
                  >
                    <div className="w-3 h-3 rounded-full bg-slate-500 shrink-0" />
                    <span className="text-xs text-slate-300 flex-1">Default (no layer)</span>
                  </div>
                  {layers.map(layer => (
                    <div key={layer.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${activeLayerId === layer.id ? 'bg-amber-500/10 border border-amber-800' : 'hover:bg-slate-800 border border-transparent'}`}
                      onClick={() => setActiveLayerId(layer.id)}
                    >
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 truncate">{layer.name}</p>
                        <p className="text-xs text-slate-600 capitalize">{layer.discipline}</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleToggleLayerVisibility(layer) }}
                        className={`text-xs px-1 rounded transition-colors ${layer.is_visible ? 'text-green-400' : 'text-slate-600'}`}
                        title={layer.is_visible ? 'Hide' : 'Show'}
                      >{layer.is_visible ? '👁' : '🚫'}</button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteLayer(layer.id) }}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                      ><Trash2 size={11} /></button>
                    </div>
                  ))}
                </div>
              )}

              {activeLayerId && (
                <div className="bg-amber-900/20 border border-amber-900 rounded-lg p-2 text-xs text-amber-400">
                  New measurements → layer: <strong>{layers.find(l => l.id === activeLayerId)?.name}</strong>
                </div>
              )}
            </div>
          ) : (
            /* Properties panel */
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {!selected ? (
                <p className="text-xs text-slate-500 text-center pt-4">Select a measurement to edit its properties</p>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Type</p>
                    <p className="text-sm text-white capitalize">{selected.type}</p>
                  </div>
                  {selected.real_value !== null && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Value</p>
                      <p className="text-lg font-bold text-amber-400">{selected.real_value.toFixed(3)} {selected.unit}</p>
                    </div>
                  )}
                  {!scaleFactor && (
                    <div className="bg-amber-900/30 border border-amber-800 rounded-lg p-2">
                      <p className="text-xs text-amber-400">Calibrate scale to see real measurements</p>
                    </div>
                  )}

                  {/* Label edit */}
                  <div>
                    <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Label</p>
                    <input
                      defaultValue={selected.label ?? ''}
                      onBlur={async e => {
                        if (e.target.value !== selected.label) {
                          setMeasurements(prev => prev.map(m => m.id === selected.id ? { ...m, label: e.target.value } : m))
                          await updateMeasurement(selected.id, { label: e.target.value || null })
                        }
                      }}
                      className="w-full text-xs bg-slate-800 border border-slate-700 text-white rounded px-2 py-1.5 focus:outline-none focus:border-amber-500"
                      placeholder="Add label…"
                    />
                  </div>

                  {/* BOQ link */}
                  <div>
                    <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Link to BOQ Item</p>
                    <select
                      value={selected.boq_item_id ?? ''}
                      onChange={e => handleLinkBOQ(e.target.value)}
                      className="w-full text-xs bg-slate-800 border border-slate-700 text-white rounded px-2 py-1.5 focus:outline-none focus:border-amber-500"
                    >
                      <option value="">— Not linked —</option>
                      {boqItems.map(b => (
                        <option key={b.id} value={b.id}>{b.item_code} — {b.description.slice(0, 25)}</option>
                      ))}
                    </select>
                    {selected.boq_item_id && (
                      <p className="text-xs text-amber-400 mt-1">
                        Unit: {boqItems.find(b => b.id === selected.boq_item_id)?.unit ?? ''}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteMeasurement(selected.id)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900 transition-colors"
                  >
                    <Trash2 size={12} /> Delete Measurement
                  </button>
                </>
              )}

              {/* Calibration section */}
              <div className="border-t border-slate-800 pt-3">
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Scale Calibration</p>
                {calib ? (
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>1 {calib.real_unit} = {calib.scale_factor.toFixed(2)} px</p>
                    <p>Real distance: {calib.real_distance} {calib.real_unit}</p>
                    <button onClick={() => setTool('calibrate')} className="text-amber-400 hover:text-amber-300">Re-calibrate</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setTool('calibrate')}
                    className="w-full text-xs py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-900 transition-colors"
                  >
                    <Crosshair size={12} className="inline mr-1.5" />
                    Set Scale
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="flex items-center gap-4 px-4 py-1.5 bg-slate-900 border-t border-slate-800 text-xs text-slate-500 shrink-0">
        <span>Tool: <span className="text-slate-300 capitalize">{tool}</span></span>
        {drawing_state.length > 0 && (
          <span className="text-amber-400">
            {tool === 'length' || tool === 'area' ? `${drawing_state.length} point${drawing_state.length !== 1 ? 's' : ''} — double-click to finish` :
             tool === 'count' ? `${drawing_state.length} marks — double-click to save` :
             tool === 'calibrate' ? 'Click second point…' : ''}
          </span>
        )}
        {mousePos && <span>x:{Math.round(mousePos.x)} y:{Math.round(mousePos.y)}</span>}
        <span className="ml-auto">S=select L=length A=area R=rect C=count H=highlight ±=zoom Esc=cancel Del=delete</span>
      </div>

      {/* ── Calibration dialog ── */}
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
    </div>
  )
}
