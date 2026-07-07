'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useWorkspace } from './workspace-context'
import { getDrawingUrl } from '@/app/actions/drawings'
import { renderMeasurements } from '@/lib/takeoff/renderer'
import type { TakeoffMeasurement } from '@/lib/takeoff/renderer'
import type { DrawingMeasurement } from '@/lib/types'
import {
  ImageIcon, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  RotateCw, Maximize2, FileText, Compass, Info, AlertTriangle, RefreshCw,
} from 'lucide-react'

interface ViewTransform {
  x: number
  y: number
  zoom: number
  rotation: number
}

export function WorkspaceDrawingViewer() {
  const {
    data, selection, selectDrawing,
    linkedMeasurements, linkedDrawingMeasurements,
  } = useWorkspace()

  const drawing = selection.drawing

  // URL + loading
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [pdfDoc, setPdfDoc] = useState<unknown>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  // Transform
  const [transform, setTransform] = useState<ViewTransform>({ x: 0, y: 0, zoom: 1, rotation: 0 })

  // Pan
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const transformStart = useRef({ x: 0, y: 0 })
  const isSpaceDown = useRef(false)

  // Tooltip
  const [hoveredMeasurement, setHoveredMeasurement] = useState<DrawingMeasurement | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  // Refs
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null)
  const renderQueued = useRef(false)

  // Determine highlighted measurement IDs based on selection
  const highlightedIds = useMemo(() => {
    const ids = new Set<string>()

    // When BOQ item is selected, find linked drawing measurements
    if (selection.boqItem) {
      for (const mi of linkedMeasurements) {
        if (mi.lines) {
          for (const line of mi.lines) {
            if (line.drawing_measurement_id) {
              ids.add(line.drawing_measurement_id)
            }
          }
        }
      }
    }

    // When measurement item is selected, find its drawing_measurement_ids
    if (selection.measurement?.lines) {
      for (const line of selection.measurement.lines) {
        if (line.drawing_measurement_id) {
          ids.add(line.drawing_measurement_id)
        }
      }
    }

    return ids
  }, [selection.boqItem, selection.measurement, linkedMeasurements])

  // Auto-switch drawing when highlighted measurements are on a different drawing
  useEffect(() => {
    if (highlightedIds.size === 0) return

    // Find which drawing contains these measurements
    for (const [drawingId, dms] of Object.entries(data.drawingMeasurements)) {
      const hasHighlighted = dms.some(dm => highlightedIds.has(dm.id))
      if (hasHighlighted && drawing?.id !== drawingId) {
        const targetDrawing = data.drawings.find(d => d.id === drawingId)
        if (targetDrawing) {
          selectDrawing(targetDrawing)
        }
        break
      }
    }
  }, [highlightedIds, data.drawingMeasurements, data.drawings, drawing?.id, selectDrawing])

  // Get current drawing's measurements
  const currentDrawingMeasurements = useMemo(() => {
    if (!drawing) return []
    return data.drawingMeasurements[drawing.id] ?? []
  }, [drawing, data.drawingMeasurements])

  const takeoffMeasurements: TakeoffMeasurement[] = useMemo(() =>
    currentDrawingMeasurements.map(m => ({
      id: m.id,
      tool_type: m.tool_type,
      coordinates: m.coordinates,
      quantity: m.quantity,
      unit: m.unit,
      color: m.color,
      label: m.label,
    })),
    [currentDrawingMeasurements],
  )

  const isPdf = drawing?.file_type === 'pdf'
  const isImage = drawing?.file_type && ['png', 'jpg', 'jpeg'].includes(drawing.file_type)

  // Load drawing URL
  useEffect(() => {
    if (!drawing) { setImageUrl(null); setPdfDoc(null); setLoadError(null); return }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setImageUrl(null)
    setPdfDoc(null)
    setTransform({ x: 0, y: 0, zoom: 1, rotation: 0 })
    getDrawingUrl(drawing.file_path)
      .then(url => {
        if (cancelled) return
        if (!url) throw new Error('empty url')
        setImageUrl(url)
        if (!isPdf) setLoading(false)
        // For PDFs, loading stays true until the PDF-load effect below resolves.
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('Failed to load this drawing. The file may be missing, or the connection was interrupted.')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [drawing, isPdf, retryKey])

  // Load PDF
  useEffect(() => {
    if (!isPdf || !imageUrl) return
    let cancelled = false
    async function load() {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        const doc = await pdfjsLib.getDocument({ url: imageUrl! }).promise
        if (!cancelled) {
          setPdfDoc(doc)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setLoading(false)
          setLoadError('Failed to render this PDF. It may be corrupted or in an unsupported format.')
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [isPdf, imageUrl])

  // Render PDF page
  const renderPdf = useCallback(async () => {
    if (!pdfDoc || !pdfCanvasRef.current) return
    const doc = pdfDoc as {
      getPage: (n: number) => Promise<{
        getViewport: (o: { scale: number }) => { width: number; height: number }
        render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> }
      }>
    }
    const pg = await doc.getPage(1)
    const viewport = pg.getViewport({ scale: 1.5 })
    const canvas = pdfCanvasRef.current
    canvas.width = viewport.width
    canvas.height = viewport.height
    setCanvasSize({ width: viewport.width, height: viewport.height })
    const ctx = canvas.getContext('2d')!
    await pg.render({ canvasContext: ctx, viewport }).promise
  }, [pdfDoc])

  useEffect(() => { renderPdf() }, [renderPdf])

  // Handle image load
  const handleImageLoad = useCallback(() => {
    const img = imageRef.current
    if (!img) return
    setCanvasSize({ width: img.naturalWidth, height: img.naturalHeight })
    // Draw image to pdf canvas for unified rendering
    const canvas = pdfCanvasRef.current
    if (canvas) {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
    }
  }, [])

  // Resize overlay
  useEffect(() => {
    if (!overlayCanvasRef.current || canvasSize.width === 0) return
    overlayCanvasRef.current.width = canvasSize.width
    overlayCanvasRef.current.height = canvasSize.height
  }, [canvasSize])

  // Render overlay with measurements
  const renderOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (takeoffMeasurements.length > 0) {
      renderMeasurements(
        ctx,
        takeoffMeasurements,
        1,
        undefined,
        highlightedIds.size > 0 ? highlightedIds : undefined,
      )
    }
  }, [takeoffMeasurements, highlightedIds])

  useEffect(() => {
    if (renderQueued.current) return
    renderQueued.current = true
    requestAnimationFrame(() => {
      renderOverlay()
      renderQueued.current = false
    })
  }, [renderOverlay])

  // Render minimap
  useEffect(() => {
    const minimap = minimapCanvasRef.current
    const source = pdfCanvasRef.current
    const container = containerRef.current
    if (!minimap || !source || !container || canvasSize.width === 0) return

    const mw = 160
    const mh = 120
    const scale = Math.min(mw / canvasSize.width, mh / canvasSize.height)
    minimap.width = mw
    minimap.height = mh
    const ctx = minimap.getContext('2d')!
    ctx.clearRect(0, 0, mw, mh)

    // Draw scaled drawing
    const dw = canvasSize.width * scale
    const dh = canvasSize.height * scale
    const dx = (mw - dw) / 2
    const dy = (mh - dh) / 2
    ctx.drawImage(source, dx, dy, dw, dh)

    // Draw viewport rectangle
    const cw = container.clientWidth
    const ch = container.clientHeight
    const vx = dx + (-transform.x / transform.zoom) * scale
    const vy = dy + (-transform.y / transform.zoom) * scale
    const vw = (cw / transform.zoom) * scale
    const vh = (ch / transform.zoom) * scale
    ctx.strokeStyle = '#3B82F6'
    ctx.lineWidth = 1.5
    ctx.strokeRect(vx, vy, vw, vh)
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'
    ctx.fillRect(vx, vy, vw, vh)
  }, [canvasSize, transform])

  // Auto-zoom to highlighted measurements
  useEffect(() => {
    if (highlightedIds.size === 0 || !containerRef.current) return

    const highlighted = currentDrawingMeasurements.filter(m => highlightedIds.has(m.id))
    if (highlighted.length === 0) return

    // Compute bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const m of highlighted) {
      const coords = m.coordinates as Record<string, unknown>
      if (coords?.points && Array.isArray(coords.points)) {
        for (const p of coords.points as number[][]) {
          minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1])
          maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1])
        }
      } else if (coords?.origin && Array.isArray(coords.origin)) {
        const [ox, oy] = coords.origin as number[]
        const w = (coords.width as number) ?? 0
        const h = (coords.height as number) ?? 0
        minX = Math.min(minX, ox); minY = Math.min(minY, oy)
        maxX = Math.max(maxX, ox + w); maxY = Math.max(maxY, oy + h)
      } else if (coords?.center && Array.isArray(coords.center)) {
        const [cx, cy] = coords.center as number[]
        const r = (coords.radius as number) ?? 0
        minX = Math.min(minX, cx - r); minY = Math.min(minY, cy - r)
        maxX = Math.max(maxX, cx + r); maxY = Math.max(maxY, cy + r)
      }
    }

    if (minX === Infinity) return

    const container = containerRef.current
    const cw = container.clientWidth
    const ch = container.clientHeight
    const padding = 80
    const bw = maxX - minX + padding * 2
    const bh = maxY - minY + padding * 2
    const fitZoom = Math.min(cw / bw, ch / bh, 3)
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    setTransform({
      x: cw / 2 - centerX * fitZoom,
      y: ch / 2 - centerY * fitZoom,
      zoom: fitZoom,
      rotation: 0,
    })
  }, [highlightedIds, currentDrawingMeasurements])

  // Coordinate conversion
  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current
    if (!container) return { x: 0, y: 0 }
    const rect = container.getBoundingClientRect()
    return {
      x: (clientX - rect.left - transform.x) / transform.zoom,
      y: (clientY - rect.top - transform.y) / transform.zoom,
    }
  }, [transform])

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (isSpaceDown.current && e.button === 0)) {
      isPanning.current = true
      panStart.current = { x: e.clientX, y: e.clientY }
      transformStart.current = { x: transform.x, y: transform.y }
      e.preventDefault()
    }
  }, [transform])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) {
      setTransform(prev => ({
        ...prev,
        x: transformStart.current.x + (e.clientX - panStart.current.x),
        y: transformStart.current.y + (e.clientY - panStart.current.y),
      }))
      return
    }

    // Check for measurement hover for tooltip
    const pt = screenToCanvas(e.clientX, e.clientY)
    const HIT_RADIUS = 15
    let found: DrawingMeasurement | null = null
    for (const m of currentDrawingMeasurements) {
      const coords = m.coordinates as Record<string, unknown>
      if (coords?.points && Array.isArray(coords.points)) {
        for (const p of coords.points as number[][]) {
          const dx = pt.x - p[0], dy = pt.y - p[1]
          if (Math.sqrt(dx * dx + dy * dy) < HIT_RADIUS) {
            found = m; break
          }
        }
      }
      if (coords?.center && Array.isArray(coords.center)) {
        const [cx, cy] = coords.center as number[]
        const r = (coords.radius as number) ?? 0
        const dx = pt.x - cx, dy = pt.y - cy
        if (Math.sqrt(dx * dx + dy * dy) < r + HIT_RADIUS) found = m
      }
      if (coords?.origin && Array.isArray(coords.origin)) {
        const [ox, oy] = coords.origin as number[]
        const w = (coords.width as number) ?? 0
        const h = (coords.height as number) ?? 0
        if (pt.x >= ox - HIT_RADIUS && pt.x <= ox + w + HIT_RADIUS && pt.y >= oy - HIT_RADIUS && pt.y <= oy + h + HIT_RADIUS) found = m
      }
      if (found) break
    }
    setHoveredMeasurement(found)
    if (found) {
      setTooltipPos({ x: e.clientX, y: e.clientY })
    }
  }, [screenToCanvas, currentDrawingMeasurements])

  const handleMouseUp = useCallback(() => {
    isPanning.current = false
  }, [])

  // Wheel zoom toward cursor
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const cursorX = e.clientX - rect.left
    const cursorY = e.clientY - rect.top

    setTransform(prev => {
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.min(5, Math.max(0.1, prev.zoom * factor))
      const scale = newZoom / prev.zoom
      return {
        ...prev,
        zoom: newZoom,
        x: cursorX - scale * (cursorX - prev.x),
        y: cursorY - scale * (cursorY - prev.y),
      }
    })
  }, [])

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === ' ') { isSpaceDown.current = true; e.preventDefault() }
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
  }, [])

  // Navigation helpers
  const currentIndex = drawing ? data.drawings.findIndex(d => d.id === drawing.id) : -1
  const canPrev = currentIndex > 0
  const canNext = currentIndex < data.drawings.length - 1

  const fitToPage = useCallback(() => {
    if (!containerRef.current || canvasSize.width === 0) return
    const cw = containerRef.current.clientWidth
    const ch = containerRef.current.clientHeight
    const fitZoom = Math.min(cw / canvasSize.width, ch / canvasSize.height) * 0.95
    setTransform({ x: 0, y: 0, zoom: Math.max(0.1, fitZoom), rotation: 0 })
  }, [canvasSize])

  const cursor = isPanning.current || isSpaceDown.current ? 'grab' : 'default'

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] dark:bg-[var(--background)] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 h-10 bg-white dark:bg-[var(--background)] border-b border-[var(--color-border)]/60 dark:border-white/[0.04] shrink-0">
        <div className="flex items-center gap-2">
          {/* Drawing tabs */}
          <div className="flex items-center gap-0.5 overflow-x-auto max-w-[400px] scrollbar-none">
            {data.drawings.map(d => (
              <button
                key={d.id}
                onClick={() => selectDrawing(d)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-md whitespace-nowrap transition-all',
                  drawing?.id === d.id
                    ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] dark:hover:bg-white/[0.03]'
                )}
              >
                <FileText size={10} />
                {d.drawing_number ?? d.name}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => canPrev && selectDrawing(data.drawings[currentIndex - 1])}
            disabled={!canPrev}
            className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] dark:hover:bg-white/[0.04] disabled:opacity-30 transition-colors"
            title="Previous drawing"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => canNext && selectDrawing(data.drawings[currentIndex + 1])}
            disabled={!canNext}
            className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] dark:hover:bg-white/[0.04] disabled:opacity-30 transition-colors"
            title="Next drawing"
          >
            <ChevronRight size={14} />
          </button>
          <div className="w-px h-4 bg-[var(--color-surface)] dark:bg-white/[0.06] mx-1" />
          <button
            onClick={() => setTransform(prev => ({ ...prev, zoom: Math.min(5, prev.zoom + 0.25) }))}
            className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] dark:hover:bg-white/[0.04]"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <span className="text-[10px] tabular-nums text-[var(--color-text-muted)] w-10 text-center">
            {Math.round(transform.zoom * 100)}%
          </span>
          <button
            onClick={() => setTransform(prev => ({ ...prev, zoom: Math.max(0.1, prev.zoom - 0.25) }))}
            className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] dark:hover:bg-white/[0.04]"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => setTransform(prev => ({ ...prev, rotation: (prev.rotation + 90) % 360 }))}
            className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] dark:hover:bg-white/[0.04]"
            title="Rotate"
          >
            <RotateCw size={14} />
          </button>
          <button
            onClick={fitToPage}
            className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] dark:hover:bg-white/[0.04]"
            title="Fit to page"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Main viewer area */}
      <div className="flex-1 overflow-hidden relative" ref={containerRef}>
        <AnimatePresence mode="wait">
          {!drawing ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-full"
            >
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--color-surface)] dark:bg-white/[0.03] flex items-center justify-center">
                  <ImageIcon size={32} className="text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]" />
                </div>
                <p className="text-sm font-medium text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">No Drawings</p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Upload drawings to view them here</p>
              </div>
            </motion.div>
          ) : loadError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-full"
            >
              <div className="flex flex-col items-center gap-3 text-center px-6 max-w-xs">
                <div className="w-12 h-12 rounded-2xl bg-[var(--color-danger-tint)] flex items-center justify-center">
                  <AlertTriangle size={22} className="text-[var(--color-danger)]" />
                </div>
                <p className="text-[13px] text-[var(--color-danger)]">{loadError}</p>
                <button
                  onClick={() => setRetryKey(k => k + 1)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)] hover:border-[var(--color-brand)]/40 transition-all"
                >
                  <RefreshCw size={12} /> Retry
                </button>
              </div>
            </motion.div>
          ) : loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-full"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] text-[var(--color-text-muted)]">Loading drawing...</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="viewer"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full overflow-hidden"
              style={{ cursor }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              <div
                style={{
                  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom}) rotate(${transform.rotation}deg)`,
                  transformOrigin: '0 0',
                  position: 'relative',
                  width: canvasSize.width || 'auto',
                  height: canvasSize.height || 'auto',
                }}
              >
                {/* PDF canvas layer */}
                <canvas ref={pdfCanvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />

                {/* Hidden image for loading (image mode) */}
                {isImage && imageUrl && (
                  <img
                    ref={imageRef}
                    src={imageUrl}
                    alt={drawing.name}
                    onLoad={handleImageLoad}
                    className="hidden"
                  />
                )}

                {/* Overlay canvas for measurement annotations */}
                <canvas
                  ref={overlayCanvasRef}
                  style={{ position: 'absolute', top: 0, left: 0 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compass indicator - top right */}
        {drawing && (
          <div className="absolute top-3 right-3 z-10">
            <div
              className="w-10 h-10 rounded-full bg-white/90 dark:bg-[var(--color-surface-elevated)]/90 backdrop-blur shadow-lg border border-[var(--color-border)]/60 dark:border-white/[0.06] flex items-center justify-center"
              style={{ transform: `rotate(-${transform.rotation}deg)` }}
              title="North"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15 10H9L12 2Z" fill="#EF4444" />
                <path d="M12 22L9 14H15L12 22Z" fill="#94A3B8" />
                <circle cx="12" cy="12" r="1.5" fill="#64748B" />
                <text x="12" y="7" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#EF4444">N</text>
              </svg>
            </div>
          </div>
        )}

        {/* Zoom percentage display */}
        {drawing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-16 left-3 z-10 bg-white/90 dark:bg-[var(--color-surface-elevated)]/90 backdrop-blur rounded-lg shadow-lg border border-[var(--color-border)]/60 dark:border-white/[0.06] px-2.5 py-1 text-[10px] font-mono text-[var(--color-text-muted)] dark:text-[var(--color-text-secondary)] tabular-nums"
          >
            {Math.round(transform.zoom * 100)}%
          </motion.div>
        )}

        {/* Minimap - bottom right */}
        {drawing && canvasSize.width > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-3 right-3 z-10 bg-white/95 dark:bg-[var(--color-surface-elevated)]/95 backdrop-blur rounded-lg shadow-lg border border-[var(--color-border)]/60 dark:border-white/[0.06] overflow-hidden"
          >
            <canvas
              ref={minimapCanvasRef}
              width={160}
              height={120}
              className="block"
            />
          </motion.div>
        )}

        {/* Floating measurement tooltip */}
        <AnimatePresence>
          {hoveredMeasurement && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="fixed z-50 pointer-events-none"
              style={{
                left: tooltipPos.x + 16,
                top: tooltipPos.y - 8,
              }}
            >
              <div className="bg-[var(--color-surface)]/95 dark:bg-[var(--color-surface-hover)]/95 backdrop-blur text-white rounded-lg shadow-xl px-3 py-2 text-[11px] max-w-[240px]">
                <div className="flex items-center gap-1.5 mb-1">
                  <Info size={10} className="text-[var(--color-text-muted)]" />
                  <span className="font-semibold capitalize">{hoveredMeasurement.tool_type}</span>
                </div>
                {hoveredMeasurement.label && (
                  <p className="text-[var(--color-text-secondary)] mb-0.5">{hoveredMeasurement.label}</p>
                )}
                <p className="font-mono text-indigo-300">
                  {hoveredMeasurement.quantity % 1 === 0
                    ? hoveredMeasurement.quantity.toString()
                    : hoveredMeasurement.quantity.toFixed(2)
                  }
                  {' '}
                  {hoveredMeasurement.unit ?? 'px'}
                </p>
                {highlightedIds.has(hoveredMeasurement.id) && (
                  <div className="mt-1 flex items-center gap-1 text-[9px] text-[var(--color-brand)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand)]" />
                    Linked to selected item
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status bar */}
      {drawing && (
        <div className="flex items-center justify-between px-3 h-6 bg-white dark:bg-[var(--background)] border-t border-[var(--color-border)] dark:border-white/[0.04] text-[10px] text-[var(--color-text-muted)] shrink-0">
          <div className="flex items-center gap-3">
            <span>{drawing.name}</span>
            {drawing.drawing_number && <span className="font-mono">{drawing.drawing_number}</span>}
            <span>{drawing.drawing_type}</span>
          </div>
          <div className="flex items-center gap-3">
            {currentDrawingMeasurements.length > 0 && (
              <span>{currentDrawingMeasurements.length} measurement{currentDrawingMeasurements.length !== 1 ? 's' : ''}</span>
            )}
            {highlightedIds.size > 0 && (
              <span className="text-[var(--color-brand)]">{highlightedIds.size} highlighted</span>
            )}
            <span>{drawing.file_type?.toUpperCase()}</span>
            {drawing.file_size && <span>{(drawing.file_size / 1024 / 1024).toFixed(1)} MB</span>}
            <span>{drawing.page_count} page{drawing.page_count !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
    </div>
  )
}
