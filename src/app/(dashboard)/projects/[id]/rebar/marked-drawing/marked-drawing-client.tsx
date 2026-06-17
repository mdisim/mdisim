'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Loader2, FileText, Link2Off } from 'lucide-react'
import { updateBarLabel } from '@/app/actions/rebar'

interface BarMark {
  id: string
  mark: string
  diameter: number
  quantity: number
  element: string
  bbox: { x0: number; y0: number; x1: number; y1: number; canvasW: number; canvasH: number; page: number } | null
  confidence: number | null
  labelX: number | null
  labelY: number | null
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
  flashing?: boolean
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
  const [showDiag, setShowDiag] = useState(false)
  const [confidenceFilter, setConfidenceFilter] = useState(0)
  const [renderingPdf, setRenderingPdf] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [pdfRenderedPages, setPdfRenderedPages] = useState<Map<number, string>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const currentRenderIdRef = useRef<string | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedDrawing = drawings.find(d => d.id === selectedDrawingId) ?? null

  const linkedBars = barMarks.filter(b => b.sourceDrawingId === selectedDrawingId)
  const unlinkedBars = barMarks.filter(b => !b.sourceDrawingId)
  const allDisplayBars = [...linkedBars, ...unlinkedBars]

  const [diagLog, setDiagLog] = useState<string[]>([])

  function placeLabelsForDrawing(drawingId: string) {
    const log: string[] = []
    log.push(`=== placeLabelsForDrawing("${drawingId}") ===`)
    log.push(`Total barMarks from server: ${barMarks.length}`)

    const linked = barMarks.filter(b => b.sourceDrawingId === drawingId)
    const unlinked = barMarks.filter(b => !b.sourceDrawingId)
    const otherDrawing = barMarks.filter(b => b.sourceDrawingId && b.sourceDrawingId !== drawingId)
    log.push(`Linked to this drawing: ${linked.length}`)
    log.push(`Unlinked (no sourceDrawingId): ${unlinked.length}`)
    log.push(`Linked to OTHER drawing: ${otherDrawing.length}`)

    const candidates = linked.length > 0 ? [...linked, ...unlinked] : unlinked
    log.push(`Candidates for placement: ${candidates.length}`)

    const withBbox = candidates.filter(b => b.bbox)
    const withLabelXY = candidates.filter(b => b.labelX != null && b.labelY != null)
    const withEither = candidates.filter(b => b.labelX != null || b.bbox)
    const withNeither = candidates.filter(b => b.labelX == null && !b.bbox)
    log.push(`  with bbox: ${withBbox.length}`)
    log.push(`  with label_x/label_y: ${withLabelXY.length}`)
    log.push(`  with either (placeable): ${withEither.length}`)
    log.push(`  with NEITHER (no position): ${withNeither.length}`)

    for (const bm of candidates) {
      const hasBbox = !!bm.bbox
      const hasLabel = bm.labelX != null && bm.labelY != null
      let computedX = '—', computedY = '—', computedPage = '—', source = 'NONE'
      if (hasLabel) {
        computedX = String(bm.labelX)
        computedY = String(bm.labelY)
        computedPage = String(bm.bbox?.page ?? bm.sourcePage ?? 1)
        source = 'label_xy'
      } else if (hasBbox) {
        const bbox = bm.bbox!
        computedX = (((bbox.x0 + bbox.x1) / 2 / bbox.canvasW) * 100).toFixed(2)
        computedY = (((bbox.y0 + bbox.y1) / 2 / bbox.canvasH) * 100).toFixed(2)
        computedPage = String(bbox.page)
        source = 'bbox'
      }
      log.push(
        `  ${bm.mark} T${bm.diameter} x${bm.quantity} | ` +
        `srcDwg=${bm.sourceDrawingId ? bm.sourceDrawingId.slice(0, 8) : 'null'} | ` +
        `bbox=${hasBbox ? `p${bm.bbox!.page}(${bm.bbox!.x0},${bm.bbox!.y0})→(${bm.bbox!.x1},${bm.bbox!.y1}) canvas=${bm.bbox!.canvasW}x${bm.bbox!.canvasH}` : 'null'} | ` +
        `label=(${bm.labelX ?? 'null'},${bm.labelY ?? 'null'}) | ` +
        `→ source=${source} x=${computedX}% y=${computedY}% page=${computedPage}`
      )
    }

    const placeable = candidates.filter(b => b.labelX != null || b.bbox)
    const newLabels = placeable.map(bm => {
      let x: number, y: number, page: number
      if (bm.labelX != null && bm.labelY != null) {
        x = bm.labelX
        y = bm.labelY
        page = bm.bbox?.page ?? bm.sourcePage ?? 1
      } else if (bm.bbox) {
        x = ((bm.bbox.x0 + bm.bbox.x1) / 2 / bm.bbox.canvasW) * 100
        y = ((bm.bbox.y0 + bm.bbox.y1) / 2 / bm.bbox.canvasH) * 100
        page = bm.bbox.page
      } else {
        return null
      }
      return {
        barId: bm.id, mark: bm.mark, diameter: bm.diameter,
        quantity: bm.quantity, element: bm.element,
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
        page, confidence: bm.confidence,
      }
    }).filter((l): l is PlacedLabel => l !== null)

    log.push(`Labels created: ${newLabels.length}`)
    log.push(`Current page: ${currentPage}`)
    const onCurrentPage = newLabels.filter(l => l.page === currentPage)
    log.push(`Labels on current page ${currentPage}: ${onCurrentPage.length}`)
    for (const l of newLabels) {
      log.push(`  LABEL: ${l.mark} T${l.diameter} x=${l.x.toFixed(2)}% y=${l.y.toFixed(2)}% page=${l.page}`)
    }

    console.log('[MarkedDrawing] Diagnostics:\n' + log.join('\n'))
    setDiagLog(log)
    setLabels(newLabels)
  }

  useEffect(() => {
    if (!selectedDrawingId) return

    setImageUrl(null)
    setImageSize(null)
    setPdfRenderedPages(new Map())
    setRenderError(null)
    setCurrentPage(1)
    setTotalPages(1)
    setZoom(1)
    setPan({ x: 0, y: 0 })

    const drawingPageImages = pageImages.filter(p => p.drawingId === selectedDrawingId)
    if (drawingPageImages.length > 0) {
      const first = drawingPageImages[0]
      setImageUrl(first.url)
      setImageSize({ w: first.width, h: first.height })
      setCurrentPage(first.page)
      setTotalPages(drawingPageImages.length)
      placeLabelsForDrawing(selectedDrawingId)
      return
    }

    const drawing = drawings.find(d => d.id === selectedDrawingId)
    if (!drawing?.signedUrl || drawing.fileType === 'dxf') {
      setRenderError(drawing ? 'No signed URL available for this drawing' : 'Drawing not found')
      return
    }

    const renderId = selectedDrawingId
    currentRenderIdRef.current = renderId
    setRenderingPdf(true)

    ;(async () => {
      try {
        const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
        GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30_000)
        const res = await fetch(drawing.signedUrl!, { signal: controller.signal })
        clearTimeout(timeoutId)
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)

        const buf = await res.arrayBuffer()
        if (currentRenderIdRef.current !== renderId) return

        const pdf = await getDocument({ data: new Uint8Array(buf) }).promise
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
          placeLabelsForDrawing(selectedDrawingId)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (currentRenderIdRef.current === renderId) {
          setRenderError(msg)
          setRenderingPdf(false)
        }
      }
    })()

    return () => { currentRenderIdRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDrawingId])

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
    if (dragLabel) {
      const movedLabel = labels.find(l => l.barId === dragLabel)
      if (movedLabel) {
        persistLabelPosition(movedLabel.barId, movedLabel.x, movedLabel.y)
      }
    }
    setIsPanning(false)
    setDragLabel(null)
  }

  function persistLabelPosition(barId: string, x: number, y: number) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      updateBarLabel(barId, x, y).catch(() => {})
    }, 500)
  }

  const startLabelDrag = (e: React.MouseEvent, barId: string) => {
    e.stopPropagation()
    setDragLabel(barId)
  }

  const removeLabel = (barId: string) => {
    setLabels(prev => prev.filter(l => l.barId !== barId))
  }

  const addLabel = (bm: BarMark) => {
    const newLabel: PlacedLabel = {
      barId: bm.id, mark: bm.mark, diameter: bm.diameter,
      quantity: bm.quantity, element: bm.element,
      x: 50, y: 50, page: currentPage, confidence: bm.confidence,
    }
    setLabels(prev => [...prev, newLabel])
    persistLabelPosition(bm.id, 50, 50)
  }

  function flashLabel(barId: string) {
    setLabels(prev => prev.map(l =>
      l.barId === barId ? { ...l, flashing: true } : l
    ))
    setTimeout(() => {
      setLabels(prev => prev.map(l =>
        l.barId === barId ? { ...l, flashing: false } : l
      ))
    }, 800)
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
      flashLabel(barId)
    }
  }

  const handleMarkerClick = (barId: string) => {
    setActiveBarId(barId)
    flashLabel(barId)
    const el = document.getElementById(`bar-btn-${barId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const visibleLabels = labels
    .filter(l => l.page === currentPage)
    .filter(l => (l.confidence ?? 100) >= confidenceFilter)

  const barsWithLabels = new Set(labels.map(l => l.barId))
  const placedCount = allDisplayBars.filter(b => barsWithLabels.has(b.id)).length

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

        {/* Placement stats */}
        {selectedDrawingId && (linkedBars.length > 0 || unlinkedBars.length > 0) && (
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-slate-600">Placed:</span>
            <span className={placedCount === allDisplayBars.length ? 'text-green-400' : 'text-amber-400'}>
              {placedCount}/{allDisplayBars.length}
            </span>
            <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${(placedCount / Math.max(1, allDisplayBars.length)) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Placed</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" /> Has OCR pos</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Linked</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block" /> No position</span>
        </div>

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
          <button onClick={() => setZoom(z => Math.max(0.2, z - 0.25))} className="px-2 py-1 text-xs bg-slate-800 rounded hover:bg-slate-700">-</button>
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

        {imageUrl && selectedDrawingId && (
          <div className="flex flex-col gap-1.5">
            <button onClick={() => placeLabelsForDrawing(selectedDrawingId)} className="w-full px-3 py-2 text-sm rounded bg-amber-700 hover:bg-amber-600 text-white font-medium">
              Auto Place Markers Again
            </button>
            <button onClick={exportPDF} className="w-full px-3 py-2 text-sm rounded bg-green-700 hover:bg-green-600 text-white font-medium">
              Export Marked Drawing PDF
            </button>
          </div>
        )}

        {/* Diagnostics toggle */}
        <button onClick={() => setShowDiag(d => !d)} className="text-[10px] text-slate-600 hover:text-slate-400 text-left">
          {showDiag ? '▼' : '▶'} Diagnostics ({barMarks.length} bars, {labels.length} labels, {visibleLabels.length} visible)
        </button>

        {showDiag && (
          <div className="rounded border border-slate-700 bg-slate-900 p-2 text-[10px] font-mono max-h-60 overflow-y-auto space-y-2">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-1">
              <div className="px-1.5 py-1 bg-slate-800 rounded">
                <span className="text-slate-500">Total bars</span>
                <span className="block text-white font-bold">{barMarks.length}</span>
              </div>
              <div className="px-1.5 py-1 bg-slate-800 rounded">
                <span className="text-slate-500">With bbox</span>
                <span className="block text-blue-400 font-bold">{barMarks.filter(b => b.bbox).length}</span>
              </div>
              <div className="px-1.5 py-1 bg-slate-800 rounded">
                <span className="text-slate-500">With label_xy</span>
                <span className="block text-green-400 font-bold">{barMarks.filter(b => b.labelX != null).length}</span>
              </div>
              <div className="px-1.5 py-1 bg-slate-800 rounded">
                <span className="text-slate-500">No position</span>
                <span className="block text-red-400 font-bold">{barMarks.filter(b => !b.bbox && b.labelX == null).length}</span>
              </div>
              <div className="px-1.5 py-1 bg-slate-800 rounded">
                <span className="text-slate-500">Labels placed</span>
                <span className="block text-amber-400 font-bold">{labels.length}</span>
              </div>
              <div className="px-1.5 py-1 bg-slate-800 rounded">
                <span className="text-slate-500">Visible (p{currentPage})</span>
                <span className="block text-amber-400 font-bold">{visibleLabels.length}</span>
              </div>
              <div className="px-1.5 py-1 bg-slate-800 rounded">
                <span className="text-slate-500">Linked</span>
                <span className="block text-green-400 font-bold">{linkedBars.length}</span>
              </div>
              <div className="px-1.5 py-1 bg-slate-800 rounded">
                <span className="text-slate-500">Unlinked</span>
                <span className="block text-slate-400 font-bold">{unlinkedBars.length}</span>
              </div>
            </div>

            {/* Per-bar detail table */}
            <table className="w-full text-[9px]">
              <thead>
                <tr className="text-slate-500">
                  <th className="text-left py-0.5">Mark</th>
                  <th className="text-left py-0.5">Dia</th>
                  <th className="text-left py-0.5">srcDwg</th>
                  <th className="text-left py-0.5">bbox</th>
                  <th className="text-left py-0.5">label_xy</th>
                  <th className="text-left py-0.5">placed?</th>
                </tr>
              </thead>
              <tbody>
                {barMarks.map(bm => {
                  const hasBbox = !!bm.bbox
                  const hasLabel = bm.labelX != null && bm.labelY != null
                  const isPlaced = labels.some(l => l.barId === bm.id)
                  return (
                    <tr key={bm.id} className="border-t border-slate-800/50">
                      <td className="py-0.5 text-amber-400 font-bold">{bm.mark}</td>
                      <td className="py-0.5 text-slate-400">T{bm.diameter}</td>
                      <td className="py-0.5">
                        {bm.sourceDrawingId ? (
                          <span className={bm.sourceDrawingId === selectedDrawingId ? 'text-green-400' : 'text-orange-400'}>
                            {bm.sourceDrawingId.slice(0, 6)}
                          </span>
                        ) : <span className="text-red-500">null</span>}
                      </td>
                      <td className="py-0.5">
                        {hasBbox ? (
                          <span className="text-blue-400" title={JSON.stringify(bm.bbox)}>
                            p{bm.bbox!.page} ({bm.bbox!.x0},{bm.bbox!.y0})
                          </span>
                        ) : <span className="text-red-500">null</span>}
                      </td>
                      <td className="py-0.5">
                        {hasLabel ? (
                          <span className="text-green-400">
                            ({bm.labelX!.toFixed(1)},{bm.labelY!.toFixed(1)})
                          </span>
                        ) : <span className="text-red-500">null</span>}
                      </td>
                      <td className="py-0.5">
                        {isPlaced ? <span className="text-green-500">YES</span> : <span className="text-red-500">NO</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Placement log */}
            {diagLog.length > 0 && (
              <div className="mt-1 border-t border-slate-700 pt-1">
                <p className="text-slate-500 mb-0.5">Last placement log:</p>
                {diagLog.map((line, i) => (
                  <p key={i} className={
                    line.startsWith('===') ? 'text-amber-400 font-bold' :
                    line.includes('LABEL:') ? 'text-green-400' :
                    line.includes('NEITHER') || line.includes('null') ? 'text-red-400' :
                    'text-slate-400'
                  }>{line}</p>
                ))}
              </div>
            )}
          </div>
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
              <p className="text-lg mb-1">Rendering drawing...</p>
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
              const isFlashing = label.flashing
              return (
                <div
                  key={label.barId}
                  className={`absolute select-none group ${isFlashing ? 'animate-pulse' : ''}`}
                  style={{
                    left: `${label.x}%`,
                    top: `${label.y}%`,
                    transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                    zIndex: isActive ? 20 : 10,
                  }}
                  onMouseDown={e => startLabelDrag(e, label.barId)}
                  onClick={(e) => { e.stopPropagation(); handleMarkerClick(label.barId) }}
                >
                  <div className={`px-2 py-0.5 rounded text-xs font-mono font-bold whitespace-nowrap cursor-move shadow-lg transition-all ${
                    isFlashing
                      ? 'bg-white text-slate-900 ring-2 ring-amber-400 shadow-amber-500/50 scale-125'
                      : isActive
                      ? 'bg-white text-slate-900 ring-2 ring-amber-400 shadow-amber-500/50'
                      : conf >= 80
                      ? 'bg-amber-500 text-black'
                      : conf >= 60
                      ? 'bg-orange-500 text-black'
                      : 'bg-red-500 text-white'
                  }`}>
                    {label.mark} T{label.diameter} x{label.quantity}
                    {conf < 80 && <span className="ml-1 opacity-70">{conf}%</span>}
                    <button
                      onClick={e => { e.stopPropagation(); removeLabel(label.barId) }}
                      className="ml-1.5 opacity-0 group-hover:opacity-100 hover:text-red-700"
                    >x</button>
                  </div>
                  {/* Pointer line from label to exact bbox position */}
                  {isActive && (
                    <div className="absolute left-1/2 top-full w-0.5 h-4 bg-amber-400 -translate-x-1/2" />
                  )}
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
  const isLinked = !!bm.sourceDrawingId
  const hasBbox = !!bm.bbox
  return (
    <button
      id={`bar-btn-${bm.id}`}
      onClick={() => onHighlight(bm.id)}
      className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center gap-2 transition-colors ${
        isActive ? 'bg-amber-600/30 ring-1 ring-amber-500 text-amber-200' :
        placed ? 'bg-slate-800/80 hover:bg-slate-700' : 'bg-slate-800/30 hover:bg-slate-700 opacity-60'
      }`}
    >
      {/* Link status indicator */}
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        placed ? 'bg-green-500' : hasBbox ? 'bg-blue-500' : isLinked ? 'bg-amber-500' : 'bg-slate-600'
      }`} title={placed ? 'Placed on drawing' : hasBbox ? 'Has OCR position' : isLinked ? 'Linked to drawing' : 'No position data'} />
      <span className="font-mono font-bold text-amber-400">{bm.mark}</span>
      <span className="text-slate-500">T{bm.diameter}</span>
      <span className="text-slate-600">x{bm.quantity}</span>
      <span className="text-slate-700 text-[10px] ml-auto">{bm.element}</span>
      {bm.confidence != null && bm.confidence < 80 && (
        <span className={`text-[10px] px-1 rounded ${
          bm.confidence >= 60 ? 'bg-amber-900/50 text-amber-400' : 'bg-red-900/50 text-red-400'
        }`}>{bm.confidence}%</span>
      )}
      {placed ? (
        <span className="text-green-500 text-[10px]">&#9679;</span>
      ) : (
        <button onClick={e => { e.stopPropagation(); onAdd(bm) }}
          className="text-[10px] text-slate-600 hover:text-amber-400">+</button>
      )}
    </button>
  )
}
