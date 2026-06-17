'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Loader2, FileText, Link2Off } from 'lucide-react'

interface BarMark {
  id: string
  mark: string
  diameter: number
  quantity: number
  element: string
  bbox: { x0: number; y0: number; x1: number; y1: number; canvasW: number; canvasH: number; page: number } | null
  confidence: number | null
  notes: string | null
  sourceDrawingId: string | null
  sourcePage: number | null
}

interface PageImage {
  page: number
  url: string
  width: number
  height: number
  drawingId: string
}

interface DrawingOption {
  id: string
  name: string
  fileType: string
  pageCount: number
  createdAt: string
  signedUrl: string | null
  barCount: number
  hasExtractionImages: boolean
}

interface PlacedLabel {
  barId: string
  mark: string
  diameter: number
  quantity: number
  element: string
  x: number
  y: number
  page: number
  confidence: number | null
}

interface Props {
  barMarks: BarMark[]
  pageImages: PageImage[]
  drawings: DrawingOption[]
  defaultDrawingId: string | null
}

export function MarkedDrawingClient({ barMarks, pageImages, drawings, defaultDrawingId }: Props) {
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(defaultDrawingId)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [labels, setLabels] = useState<PlacedLabel[]>([])
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
  const currentRenderIdRef = useRef<string | null>(null)

  const selectedDrawing = drawings.find(d => d.id === selectedDrawingId) ?? null

  // Bars for the selected drawing (plus unlinked bars)
  const drawingBars = barMarks.filter(b =>
    b.sourceDrawingId === selectedDrawingId || !b.sourceDrawingId
  )
  const linkedBars = drawingBars.filter(b => b.sourceDrawingId === selectedDrawingId)
  const unlinkedBars = barMarks.filter(b => !b.sourceDrawingId)

  // Load drawing when selection changes
  useEffect(() => {
    if (!selectedDrawingId) return

    // Reset state
    setImageUrl(null)
    setImageSize(null)
    setPdfRenderedPages(new Map())
    setRenderError(null)
    setCurrentPage(1)
    setTotalPages(1)
    setZoom(1)
    setPan({ x: 0, y: 0 })

    // Strategy 1: extraction page images for this drawing
    const drawingPageImages = pageImages.filter(p => p.drawingId === selectedDrawingId)
    if (drawingPageImages.length > 0) {
      const first = drawingPageImages[0]
      setImageUrl(first.url)
      setImageSize({ w: first.width, h: first.height })
      setCurrentPage(first.page)
      setTotalPages(drawingPageImages.length)
      placeLabelsForDrawing(selectedDrawingId, drawingPageImages.length > 0)
      return
    }

    // Strategy 2: render source PDF
    const drawing = drawings.find(d => d.id === selectedDrawingId)
    if (!drawing?.signedUrl || drawing.fileType === 'dxf') {
      setRenderError(drawing ? 'No signed URL available for this drawing' : 'Drawing not found')
      return
    }

    // Mark this render so we can cancel stale ones
    const renderId = selectedDrawingId
    currentRenderIdRef.current = renderId
    setRenderingPdf(true)

    ;(async () => {
      try {
        console.log(`[MarkedDrawing] Rendering drawing "${drawing.name}" (${drawing.id})`)

        const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
        GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30_000)
        const res = await fetch(drawing.signedUrl!, { signal: controller.signal })
        clearTimeout(timeoutId)
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)

        const buf = await res.arrayBuffer()
        console.log(`[MarkedDrawing] PDF fetched — ${(buf.byteLength / 1024).toFixed(0)} KB`)

        if (currentRenderIdRef.current !== renderId) return

        const pdf = await getDocument({ data: new Uint8Array(buf) }).promise
        console.log(`[MarkedDrawing] ${pdf.numPages} page(s)`)

        if (currentRenderIdRef.current !== renderId) return
        setTotalPages(pdf.numPages)

        const rendered = new Map<number, string>()
        for (let p = 1; p <= pdf.numPages; p++) {
          if (currentRenderIdRef.current !== renderId) return

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

          const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
          rendered.set(p, dataUrl)
          console.log(`[MarkedDrawing] Page ${p} rendered — ${canvas.width}×${canvas.height}`)

          if (p === 1 && currentRenderIdRef.current === renderId) {
            setImageUrl(dataUrl)
            setImageSize({ w: canvas.width, h: canvas.height })
            setCurrentPage(1)
            setRenderingPdf(false)
          }
        }

        await pdf.cleanup()
        if (currentRenderIdRef.current === renderId) {
          setPdfRenderedPages(rendered)
          placeLabelsForDrawing(selectedDrawingId, false)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[MarkedDrawing] PDF render failed:', msg)
        if (currentRenderIdRef.current === renderId) {
          setRenderError(msg)
          setRenderingPdf(false)
        }
      }
    })()

    return () => { currentRenderIdRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDrawingId])

  function placeLabelsForDrawing(drawingId: string, hasPageImages: boolean) {
    const bars = barMarks.filter(b => b.sourceDrawingId === drawingId || !b.sourceDrawingId)
    const withBbox = bars.filter(b => b.bbox)

    if (withBbox.length > 0 && hasPageImages) {
      setLabels(withBbox.map(bm => {
        const bbox = bm.bbox!
        const cx = ((bbox.x0 + bbox.x1) / 2 / bbox.canvasW) * 100
        const cy = ((bbox.y0 + bbox.y1) / 2 / bbox.canvasH) * 100
        return {
          barId: bm.id, mark: bm.mark, diameter: bm.diameter,
          quantity: bm.quantity, element: bm.element,
          x: Math.max(0, Math.min(100, cx)),
          y: Math.max(0, Math.min(100, cy)),
          page: bbox.page, confidence: bm.confidence,
        }
      }))
    } else {
      setLabels([])
    }
  }

  function switchPage(page: number) {
    const pi = pageImages.find(p => p.page === page && p.drawingId === selectedDrawingId)
    if (pi) {
      setImageUrl(pi.url)
      setImageSize({ w: pi.width, h: pi.height })
      setCurrentPage(page)
      return
    }
    const rendered = pdfRenderedPages.get(page)
    if (rendered) {
      setImageUrl(rendered)
      setCurrentPage(page)
    }
  }

  function selectDrawing(drawingId: string) {
    setSelectedDrawingId(drawingId)
    setActiveBarId(null)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImageUrl(reader.result as string)
      setImageSize(null)
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
      barId: bm.id, mark: bm.mark, diameter: bm.diameter,
      quantity: bm.quantity, element: bm.element,
      x: 50, y: 50, page: currentPage, confidence: bm.confidence,
    }])
  }

  const highlightBar = (barId: string) => {
    setActiveBarId(prev => prev === barId ? null : barId)
    const label = labels.find(l => l.barId === barId)
    if (label && containerRef.current && imgRef.current) {
      if (label.page !== currentPage) switchPage(label.page)
      const container = containerRef.current
      const img = imgRef.current
      const targetZoom = Math.max(2, zoom)
      const px = (label.x / 100) * img.clientWidth * targetZoom
      const py = (label.y / 100) * img.clientHeight * targetZoom
      setZoom(targetZoom)
      setPan({ x: container.clientWidth / 2 - px, y: container.clientHeight / 2 - py })
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
      ctx.fillStyle = 'rgba(245, 158, 11, 0.9)'
      ctx.beginPath()
      ctx.roundRect(lx - (tw + pad * 2) / 2, ly - (fontSize + pad * 2) / 2, tw + pad * 2, fontSize + pad * 2, 4)
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
    a.download = `marked-drawing${selectedDrawing ? '-' + selectedDrawing.name.replace(/\s+/g, '_') : ''}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-800 p-4 overflow-y-auto shrink-0 flex flex-col gap-3">

        {/* Drawing selector */}
        {drawings.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Source Drawing</p>
            <div className="space-y-1">
              {drawings.map(d => {
                const isSelected = d.id === selectedDrawingId
                const linkedCount = barMarks.filter(b => b.sourceDrawingId === d.id).length
                return (
                  <button
                    key={d.id}
                    onClick={() => selectDrawing(d.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                      isSelected
                        ? 'bg-amber-600/20 border border-amber-600 text-amber-200'
                        : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={12} className={isSelected ? 'text-amber-400' : 'text-slate-600'} />
                      <span className="font-medium truncate">{d.name}</span>
                      <span className="text-[10px] uppercase text-slate-600 ml-auto">{d.fileType}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px]">
                      <span className={linkedCount > 0 ? 'text-green-400' : 'text-slate-600'}>
                        {linkedCount} bars
                      </span>
                      <span className="text-slate-700">{d.pageCount}pp</span>
                      {d.hasExtractionImages && (
                        <span className="text-blue-400">OCR cached</span>
                      )}
                      <span className="text-slate-700 ml-auto">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {drawings.length === 0 && (
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

        {/* Zoom controls */}
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
            Export Marked Drawing PDF
          </button>
        )}

        {/* Bar list — linked bars */}
        {linkedBars.length > 0 && (
          <>
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              Linked Bars ({linkedBars.length})
            </p>
            <div className="space-y-0.5 overflow-y-auto">
              {linkedBars.map(bm => <BarButton key={bm.id} bm={bm} labels={labels} activeBarId={activeBarId}
                onHighlight={highlightBar} onAdd={addLabel} />)}
            </div>
          </>
        )}

        {/* Unlinked bars */}
        {unlinkedBars.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-1">
              <Link2Off size={10} className="text-slate-600" />
              <p className="text-xs text-slate-600 uppercase tracking-wide">
                Unlinked ({unlinkedBars.length})
              </p>
            </div>
            <div className="space-y-0.5 overflow-y-auto">
              {unlinkedBars.map(bm => <BarButton key={bm.id} bm={bm} labels={labels} activeBarId={activeBarId}
                onHighlight={highlightBar} onAdd={addLabel} />)}
            </div>
          </>
        )}

        <p className="text-[10px] text-slate-600 mt-auto pt-2">Click bar to zoom. Alt+drag to pan. Scroll to zoom. Drag labels to reposition.</p>
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
              <p className="text-sm text-slate-600">
                {selectedDrawing ? selectedDrawing.name : 'Loading source PDF'}
              </p>
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
              <p className="text-lg mb-2">No drawing selected</p>
              <p className="text-sm">Select a source drawing from the sidebar, or upload one manually</p>
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

function BarButton({ bm, labels, activeBarId, onHighlight, onAdd }: {
  bm: BarMark
  labels: PlacedLabel[]
  activeBarId: string | null
  onHighlight: (id: string) => void
  onAdd: (bm: BarMark) => void
}) {
  const placed = labels.some(l => l.barId === bm.id)
  const isActive = activeBarId === bm.id
  return (
    <button
      onClick={() => onHighlight(bm.id)}
      className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center gap-2 transition-colors ${
        isActive ? 'bg-amber-600/30 ring-1 ring-amber-500 text-amber-200' :
        placed ? 'bg-slate-800/80 hover:bg-slate-700' : 'bg-slate-800/30 hover:bg-slate-700 opacity-60'
      }`}
    >
      <span className="font-mono font-bold text-amber-400">{bm.mark}</span>
      <span className="text-slate-500">T{bm.diameter}</span>
      <span className="text-slate-600">×{bm.quantity}</span>
      <span className="text-slate-700 text-[10px] ml-auto">{bm.element}</span>
      {bm.bbox && <span className="text-blue-400 text-[10px]" title={`p${bm.bbox.page} (${bm.bbox.x0},${bm.bbox.y0})`}>⊕</span>}
      {bm.confidence != null && bm.confidence < 80 && (
        <span className={`text-[10px] px-1 rounded ${
          bm.confidence >= 60 ? 'bg-amber-900/50 text-amber-400' : 'bg-red-900/50 text-red-400'
        }`}>{bm.confidence}%</span>
      )}
      {placed ? (
        <span className="text-green-500 text-[10px]">●</span>
      ) : (
        <button onClick={e => { e.stopPropagation(); onAdd(bm) }}
          className="text-[10px] text-slate-600 hover:text-amber-400">+</button>
      )}
    </button>
  )
}
