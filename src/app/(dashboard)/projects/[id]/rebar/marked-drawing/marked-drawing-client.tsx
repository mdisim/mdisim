'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface BarMark {
  id: string
  mark: string
  diameter: number
  quantity: number
  element: string
  bbox: { x0: number; y0: number; x1: number; y1: number; canvasW: number; canvasH: number; page: number } | null
  confidence: number | null
  notes: string | null
}

interface PageImage {
  page: number
  url: string
  width: number
  height: number
  drawingId: string
}

interface PlacedLabel {
  barId: string
  mark: string
  diameter: number
  quantity: number
  element: string
  x: number // % of image width
  y: number // % of image height
  page: number
  confidence: number | null
}

interface Props {
  barMarks: BarMark[]
  pageImages: PageImage[]
  sourceDrawingUrl: string | null
  sourceDrawingType: string | null
}

export function MarkedDrawingClient({ barMarks, pageImages, sourceDrawingUrl, sourceDrawingType }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(pageImages[0]?.url ?? null)
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(
    pageImages[0] ? { w: pageImages[0].width, h: pageImages[0].height } : null
  )
  const [currentPage, setCurrentPage] = useState(pageImages[0]?.page ?? 1)
  const [totalPages, setTotalPages] = useState(pageImages.length || 1)
  const [labels, setLabels] = useState<PlacedLabel[]>(() => initLabelsFromBbox(barMarks, pageImages))
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [dragLabel, setDragLabel] = useState<string | null>(null)
  const [activeBarId, setActiveBarId] = useState<string | null>(null)
  const [confidenceFilter, setConfidenceFilter] = useState(0)
  const [renderingPdf, setRenderingPdf] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [pdfRenderedPages, setPdfRenderedPages] = useState<Map<number, string>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const renderStartedRef = useRef(false)

  const hasAutoImage = pageImages.length > 0
  const hasPdfFallback = !hasAutoImage && !!sourceDrawingUrl && sourceDrawingType !== 'dxf'

  // Render source PDF pages when no extraction page images exist.
  // Uses a ref to prevent the effect from re-triggering on its own state changes.
  useEffect(() => {
    if (!hasPdfFallback) return
    if (renderStartedRef.current) return
    renderStartedRef.current = true

    let cancelled = false
    setRenderingPdf(true)
    setRenderError(null)

    const TIMEOUT_MS = 30_000

    ;(async () => {
      try {
        console.log('[MarkedDrawing] Starting PDF render, URL:', sourceDrawingUrl!.slice(0, 120) + '…')

        const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
        GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        console.log('[MarkedDrawing] pdf.js loaded')

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

        const res = await fetch(sourceDrawingUrl!, { signal: controller.signal })
        clearTimeout(timeoutId)

        if (!res.ok) throw new Error(`Failed to fetch drawing: HTTP ${res.status} ${res.statusText}`)
        const buf = await res.arrayBuffer()
        console.log(`[MarkedDrawing] PDF fetched — ${(buf.byteLength / 1024).toFixed(0)} KB`)

        if (cancelled) return

        const pdf = await getDocument({ data: new Uint8Array(buf) }).promise
        console.log(`[MarkedDrawing] PDF opened — ${pdf.numPages} page(s)`)

        if (cancelled) return
        setTotalPages(pdf.numPages)

        const rendered = new Map<number, string>()
        for (let p = 1; p <= pdf.numPages; p++) {
          if (cancelled) return
          console.log(`[MarkedDrawing] Rendering page ${p}/${pdf.numPages}…`)

          const page = await pdf.getPage(p)
          const scale = 3.0
          const viewport = page.getViewport({ scale })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          const ctx = canvas.getContext('2d')!
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          await page.render({ canvasContext: ctx, viewport } as Parameters<typeof page.render>[0]).promise
          console.log(`[MarkedDrawing] Page ${p} rendered — ${canvas.width}×${canvas.height}`)

          const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
          rendered.set(p, dataUrl)

          // Show first page immediately
          if (p === 1 && !cancelled) {
            setImageUrl(dataUrl)
            setImageSize({ w: canvas.width, h: canvas.height })
            setCurrentPage(1)
            // Stop showing spinner once first page is visible
            setRenderingPdf(false)
          }
        }

        await pdf.cleanup()
        console.log(`[MarkedDrawing] All ${pdf.numPages} pages rendered`)

        if (!cancelled) {
          setPdfRenderedPages(rendered)
          // Place labels from stored bbox coordinates
          if (barMarks.some(bm => bm.bbox)) {
            setLabels(barMarks.filter(bm => bm.bbox).map(bm => {
              const bbox = bm.bbox!
              const cx = ((bbox.x0 + bbox.x1) / 2 / bbox.canvasW) * 100
              const cy = ((bbox.y0 + bbox.y1) / 2 / bbox.canvasH) * 100
              return {
                barId: bm.id,
                mark: bm.mark,
                diameter: bm.diameter,
                quantity: bm.quantity,
                element: bm.element,
                x: Math.max(0, Math.min(100, cx)),
                y: Math.max(0, Math.min(100, cy)),
                page: bbox.page,
                confidence: bm.confidence,
              }
            }))
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[MarkedDrawing] PDF render failed:', msg)
        if (!cancelled) {
          setRenderError(msg)
          setRenderingPdf(false)
        }
      }
    })()

    return () => { cancelled = true }
  }, [hasPdfFallback, sourceDrawingUrl, sourceDrawingType, barMarks])

  function switchPage(page: number) {
    // From extraction page images
    const pi = pageImages.find(p => p.page === page)
    if (pi) {
      setImageUrl(pi.url)
      setImageSize({ w: pi.width, h: pi.height })
      setCurrentPage(page)
      return
    }
    // From PDF-rendered pages
    const rendered = pdfRenderedPages.get(page)
    if (rendered) {
      setImageUrl(rendered)
      setCurrentPage(page)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImageUrl(reader.result as string)
      setZoom(1)
      setPan({ x: 0, y: 0 })
    }
    reader.readAsDataURL(file)
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(z => Math.max(0.2, Math.min(5, z - e.deltaY * 0.001)))
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (dragLabel) return
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
      return
    }
    if (dragLabel && imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setLabels(prev => prev.map(l =>
        l.barId === dragLabel ? { ...l, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : l
      ))
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
    setDragLabel(null)
  }

  const startLabelDrag = (e: React.MouseEvent, barId: string) => {
    e.stopPropagation()
    setDragLabel(barId)
  }

  const removeLabel = (barId: string) => {
    setLabels(prev => prev.filter(l => l.barId !== barId))
  }

  const addLabel = (bm: BarMark) => {
    setLabels(prev => [...prev, {
      barId: bm.id,
      mark: bm.mark,
      diameter: bm.diameter,
      quantity: bm.quantity,
      element: bm.element,
      x: 50,
      y: 50,
      page: currentPage,
      confidence: bm.confidence,
    }])
  }

  const highlightBar = (barId: string) => {
    setActiveBarId(prev => prev === barId ? null : barId)

    // Zoom to bar location
    const label = labels.find(l => l.barId === barId)
    if (label && containerRef.current && imgRef.current) {
      // Switch page if needed
      if (label.page !== currentPage) {
        switchPage(label.page)
      }
      const container = containerRef.current
      const cw = container.clientWidth
      const ch = container.clientHeight
      const img = imgRef.current
      const targetZoom = Math.max(2, zoom)
      const px = (label.x / 100) * img.clientWidth * targetZoom
      const py = (label.y / 100) * img.clientHeight * targetZoom
      setZoom(targetZoom)
      setPan({ x: cw / 2 - px, y: ch / 2 - py })
    }
  }

  const visibleLabels = labels
    .filter(l => l.page === currentPage)
    .filter(l => (l.confidence ?? 100) >= confidenceFilter)

  const exportPDF = async () => {
    if (!imgRef.current || !imageUrl) return
    const canvas = document.createElement('canvas')
    const img = imgRef.current
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(img, 0, 0)

    for (const label of visibleLabels) {
      const lx = (label.x / 100) * canvas.width
      const ly = (label.y / 100) * canvas.height
      const fontSize = Math.max(14, canvas.width * 0.012)
      const text = `${label.mark} T${label.diameter} ×${label.quantity}`

      ctx.font = `bold ${fontSize}px monospace`
      const tw = ctx.measureText(text).width
      const pad = fontSize * 0.3
      const bh = fontSize + pad * 2
      const bw = tw + pad * 2

      ctx.fillStyle = 'rgba(245, 158, 11, 0.9)'
      ctx.beginPath()
      ctx.roundRect(lx - bw / 2, ly - bh / 2, bw, bh, 4)
      ctx.fill()

      ctx.fillStyle = '#000'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, lx, ly)
    }

    const jpegUrl = canvas.toDataURL('image/jpeg', 0.92)
    const { buildSinglePageImagePDF } = await import('@/lib/build-pdf')
    const pdfBytes = buildSinglePageImagePDF(jpegUrl, canvas.width, canvas.height)
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'marked-drawing.pdf'
    a.click()
    URL.revokeObjectURL(url)
  }

  const showUploadFallback = !hasAutoImage && !hasPdfFallback && !imageUrl

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-slate-800 p-4 overflow-y-auto shrink-0 flex flex-col gap-4">
        {hasAutoImage && (
          <div className="bg-green-900/20 border border-green-800 rounded p-2 text-xs text-green-400">
            Drawing auto-loaded from OCR extraction
          </div>
        )}

        {hasPdfFallback && !renderingPdf && imageUrl && (
          <div className="bg-blue-900/20 border border-blue-800 rounded p-2 text-xs text-blue-400">
            Drawing loaded from source PDF
          </div>
        )}

        {renderingPdf && (
          <div className="bg-amber-900/20 border border-amber-800 rounded p-2 text-xs text-amber-400 flex items-center gap-2">
            <Loader2 size={12} className="animate-spin" />
            Rendering source drawing…
          </div>
        )}

        {renderError && (
          <div className="bg-red-900/20 border border-red-800 rounded p-2 text-xs text-red-400">
            <p className="font-semibold mb-1">Drawing render failed</p>
            <p className="text-red-500">{renderError}</p>
          </div>
        )}

        {showUploadFallback && (
          <label className="block">
            <span className="text-xs text-slate-400 uppercase tracking-wide">Upload Drawing</span>
            <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="mt-1 block w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-amber-600 file:text-white file:text-xs file:cursor-pointer" />
          </label>
        )}

        {/* Page selector */}
        {totalPages > 1 && (
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => switchPage(p)}
                className={`px-2 py-1 text-xs rounded ${currentPage === p ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                P{p}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.min(5, z + 0.25))} className="px-2 py-1 text-xs bg-slate-800 rounded hover:bg-slate-700">+</button>
          <span className="text-xs text-slate-400">{(zoom * 100).toFixed(0)}%</span>
          <button onClick={() => setZoom(z => Math.max(0.2, z - 0.25))} className="px-2 py-1 text-xs bg-slate-800 rounded hover:bg-slate-700">−</button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} className="px-2 py-1 text-xs bg-slate-800 rounded hover:bg-slate-700 ml-auto">Reset</button>
        </div>

        {/* Confidence filter */}
        <div>
          <label className="text-xs text-slate-500 block mb-1">
            Min confidence: <strong className="text-amber-400">{confidenceFilter}%</strong>
          </label>
          <input type="range" min={0} max={100} step={5} value={confidenceFilter}
            onChange={e => setConfidenceFilter(Number(e.target.value))}
            className="w-full accent-amber-500" />
        </div>

        {imageUrl && (
          <button onClick={exportPDF} className="w-full px-3 py-2 text-sm rounded bg-green-700 hover:bg-green-600 text-white font-medium">
            Export PDF
          </button>
        )}

        <p className="text-xs text-slate-500 uppercase tracking-wide">Bar Marks ({visibleLabels.length}/{labels.filter(l => l.page === currentPage).length})</p>
        <div className="space-y-1 overflow-y-auto flex-1">
          {barMarks.map(bm => {
            const placed = labels.some(l => l.barId === bm.id)
            const isActive = activeBarId === bm.id
            return (
              <button
                key={bm.id}
                onClick={() => highlightBar(bm.id)}
                className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center gap-2 transition-colors ${
                  isActive ? 'bg-amber-600/30 ring-1 ring-amber-500 text-amber-200' :
                  placed ? 'bg-slate-800/80 hover:bg-slate-700' : 'bg-slate-800/30 hover:bg-slate-700 opacity-60'
                }`}
              >
                <span className="font-mono font-bold text-amber-400">{bm.mark}</span>
                <span className="text-slate-500">T{bm.diameter}</span>
                <span className="text-slate-600">×{bm.quantity}</span>
                <span className="text-slate-700 text-[10px] ml-auto">{bm.element}</span>
                {bm.confidence != null && bm.confidence < 80 && (
                  <span className={`text-[10px] px-1 rounded ${
                    bm.confidence >= 60 ? 'bg-amber-900/50 text-amber-400' : 'bg-red-900/50 text-red-400'
                  }`}>{bm.confidence}%</span>
                )}
                {placed ? (
                  <span className="text-green-500 text-[10px]">●</span>
                ) : (
                  <button onClick={e => { e.stopPropagation(); addLabel(bm) }}
                    className="text-[10px] text-slate-600 hover:text-amber-400">+</button>
                )}
              </button>
            )
          })}
        </div>

        <p className="text-[10px] text-slate-600">Click bar to zoom. Alt+drag to pan. Scroll to zoom. Drag labels to reposition.</p>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-slate-900 cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {renderingPdf && !imageUrl ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <Loader2 size={32} className="animate-spin mx-auto mb-3 text-amber-500" />
              <p className="text-lg mb-1">Rendering drawing…</p>
              <p className="text-sm text-slate-600">Loading source PDF for marking</p>
            </div>
          </div>
        ) : renderError && !imageUrl ? (
          <div className="flex items-center justify-center h-full text-red-500">
            <div className="text-center max-w-md">
              <p className="text-lg mb-2">Drawing render failed</p>
              <p className="text-sm text-red-400 mb-4">{renderError}</p>
              <label className="inline-block">
                <span className="px-4 py-2 rounded bg-amber-600 text-white text-sm cursor-pointer hover:bg-amber-500">Upload drawing manually</span>
                <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>
        ) : !imageUrl ? (
          <div className="flex items-center justify-center h-full text-slate-600">
            <div className="text-center">
              <p className="text-lg mb-2">No drawing available</p>
              <p className="text-sm">Upload a structural drawing first, then run OCR extraction</p>
            </div>
          </div>
        ) : (
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
            className="relative inline-block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Structural drawing"
              className="max-w-none select-none"
              draggable={false}
              onLoad={() => {
                const el = imgRef.current
                if (el) setImageSize({ w: el.naturalWidth, h: el.naturalHeight })
              }}
            />
            {visibleLabels.map(label => {
              const isActive = activeBarId === label.barId
              const conf = label.confidence ?? 100
              return (
                <div
                  key={label.barId}
                  className="absolute select-none group"
                  style={{
                    left: `${label.x}%`,
                    top: `${label.y}%`,
                    transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                    zIndex: isActive ? 20 : 10,
                  }}
                  onMouseDown={e => startLabelDrag(e, label.barId)}
                  onClick={() => highlightBar(label.barId)}
                >
                  <div className={`px-2 py-0.5 rounded text-xs font-mono font-bold whitespace-nowrap cursor-move shadow-lg transition-all ${
                    isActive
                      ? 'bg-white text-slate-900 ring-2 ring-amber-400 shadow-amber-500/50'
                      : conf >= 80
                      ? 'bg-amber-500 text-black'
                      : conf >= 60
                      ? 'bg-orange-500 text-black'
                      : 'bg-red-500 text-white'
                  }`}>
                    {label.mark} T{label.diameter} ×{label.quantity}
                    {conf < 80 && <span className="ml-1 opacity-70">{conf}%</span>}
                    <button
                      onClick={e => { e.stopPropagation(); removeLabel(label.barId) }}
                      className="ml-1.5 opacity-0 group-hover:opacity-100 hover:text-red-700"
                    >×</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function initLabelsFromBbox(barMarks: BarMark[], pageImages: PageImage[]): PlacedLabel[] {
  if (pageImages.length === 0) return []

  return barMarks
    .filter(bm => bm.bbox)
    .map(bm => {
      const bbox = bm.bbox!
      const cx = ((bbox.x0 + bbox.x1) / 2 / bbox.canvasW) * 100
      const cy = ((bbox.y0 + bbox.y1) / 2 / bbox.canvasH) * 100
      return {
        barId: bm.id,
        mark: bm.mark,
        diameter: bm.diameter,
        quantity: bm.quantity,
        element: bm.element,
        x: Math.max(0, Math.min(100, cx)),
        y: Math.max(0, Math.min(100, cy)),
        page: bbox.page,
        confidence: bm.confidence,
      }
    })
}
