'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Loader2, FileText, Link2Off, Search, Filter, Eye, EyeOff, ChevronDown } from 'lucide-react'
import { updateBarLabel } from '@/app/actions/rebar'

interface BarMark {
  id: string
  mark: string
  diameter: number
  quantity: number
  weight: number | null
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
  weight: number | null
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

// Color map for diameter sizes
const DIAMETER_COLORS: Record<number, { bg: string; text: string; ring: string; glow: string; badge: string }> = {
  8:  { bg: 'bg-emerald-500',  text: 'text-black',  ring: 'ring-emerald-400',  glow: 'shadow-emerald-500/60',  badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  10: { bg: 'bg-cyan-500',     text: 'text-black',  ring: 'ring-cyan-400',     glow: 'shadow-cyan-500/60',     badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  12: { bg: 'bg-blue-500',     text: 'text-white',  ring: 'ring-blue-400',     glow: 'shadow-blue-500/60',     badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  16: { bg: 'bg-violet-500',   text: 'text-white',  ring: 'ring-violet-400',   glow: 'shadow-violet-500/60',   badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  20: { bg: 'bg-amber-500',    text: 'text-black',  ring: 'ring-amber-400',    glow: 'shadow-amber-500/60',    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  25: { bg: 'bg-orange-500',   text: 'text-black',  ring: 'ring-orange-400',   glow: 'shadow-orange-500/60',   badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  32: { bg: 'bg-red-500',      text: 'text-white',  ring: 'ring-red-400',      glow: 'shadow-red-500/60',      badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

const DEFAULT_COLOR = { bg: 'bg-slate-500', text: 'text-white', ring: 'ring-slate-400', glow: 'shadow-slate-500/60', badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }

function getDiameterColor(diameter: number) {
  return DIAMETER_COLORS[diameter] ?? DEFAULT_COLOR
}

const ALL_DIAMETERS = [8, 10, 12, 16, 20, 25, 32]

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
  const [placingBarId, setPlacingBarId] = useState<string | null>(null)
  const [confidenceFilter, setConfidenceFilter] = useState(0)
  const [renderingPdf, setRenderingPdf] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [pdfRenderedPages, setPdfRenderedPages] = useState<Map<number, string>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const currentRenderIdRef = useRef<string | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Filter state
  const [diameterFilter, setDiameterFilter] = useState<number | null>(null)
  const [markSearch, setMarkSearch] = useState('')
  const [elementFilter, setElementFilter] = useState<string | null>(null)
  const [showLabels, setShowLabels] = useState(true)
  const [sidebarTab, setSidebarTab] = useState<'drawings' | 'bars'>('bars')

  const selectedDrawing = drawings.find(d => d.id === selectedDrawingId) ?? null

  const linkedBars = barMarks.filter(b => b.sourceDrawingId === selectedDrawingId)
  const unlinkedBars = barMarks.filter(b => !b.sourceDrawingId)
  const allDisplayBars = [...linkedBars, ...unlinkedBars]

  // Unique elements for filter dropdown
  const uniqueElements = useMemo(() => {
    const set = new Set(allDisplayBars.map(b => b.element))
    return Array.from(set).sort()
  }, [allDisplayBars])

  // Unique diameters present in data
  const presentDiameters = useMemo(() => {
    const set = new Set(allDisplayBars.map(b => b.diameter))
    return ALL_DIAMETERS.filter(d => set.has(d))
  }, [allDisplayBars])

  // Filtered bars
  const filteredBars = useMemo(() => {
    return allDisplayBars.filter(b => {
      if (diameterFilter !== null && b.diameter !== diameterFilter) return false
      if (markSearch && !b.mark.toLowerCase().includes(markSearch.toLowerCase())) return false
      if (elementFilter !== null && b.element !== elementFilter) return false
      return true
    })
  }, [allDisplayBars, diameterFilter, markSearch, elementFilter])

  // Filtered bar IDs for label visibility
  const filteredBarIds = useMemo(() => new Set(filteredBars.map(b => b.id)), [filteredBars])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && placingBarId) setPlacingBarId(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [placingBarId])

  function placeLabelsForDrawing(drawingId: string) {
    const linked = barMarks.filter(b => b.sourceDrawingId === drawingId)
    const unlinked = barMarks.filter(b => !b.sourceDrawingId)
    const candidates = linked.length > 0 ? [...linked, ...unlinked] : unlinked

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
        quantity: bm.quantity, weight: bm.weight, element: bm.element,
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
        page, confidence: bm.confidence,
      }
    }).filter((l): l is PlacedLabel => l !== null)

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

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (placingBarId && imgRef.current && e.button === 0 && !e.altKey) {
      const bm = barMarks.find(b => b.id === placingBarId)
      if (!bm) return
      const rect = imgRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      const clampX = Math.max(0, Math.min(100, x))
      const clampY = Math.max(0, Math.min(100, y))
      setLabels(prev => {
        const existing = prev.filter(l => l.barId !== placingBarId)
        return [...existing, {
          barId: bm.id, mark: bm.mark, diameter: bm.diameter,
          quantity: bm.quantity, weight: bm.weight, element: bm.element,
          x: clampX, y: clampY, page: currentPage, confidence: bm.confidence,
        }]
      })
      persistLabelPosition(bm.id, clampX, clampY)
      flashLabel(bm.id)
      setPlacingBarId(null)
      setActiveBarId(bm.id)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (dragLabel) return
    if (placingBarId && e.button === 0 && !e.altKey) return
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

  function flashLabel(barId: string) {
    setLabels(prev => prev.map(l =>
      l.barId === barId ? { ...l, flashing: true } : l
    ))
    setTimeout(() => {
      setLabels(prev => prev.map(l =>
        l.barId === barId ? { ...l, flashing: false } : l
      ))
    }, 1200)
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
    .filter(l => filteredBarIds.has(l.barId))

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
      const text = `${label.mark} T${label.diameter} x${label.quantity}`
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

  // Summary stats for sidebar
  const totalWeight = filteredBars.reduce((sum, b) => sum + (b.weight ?? 0), 0)
  const totalQty = filteredBars.reduce((sum, b) => sum + b.quantity, 0)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Filter toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800 bg-slate-900/80 shrink-0">
        <Filter size={14} className="text-slate-500" />

        {/* Diameter filter */}
        <div className="relative">
          <select
            value={diameterFilter ?? ''}
            onChange={e => setDiameterFilter(e.target.value ? Number(e.target.value) : null)}
            className="appearance-none bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 pr-7 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">All Diameters</option>
            {presentDiameters.map(d => (
              <option key={d} value={d}>T{d}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>

        {/* Bar mark search */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search bar mark..."
            value={markSearch}
            onChange={e => setMarkSearch(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg pl-7 pr-3 py-1.5 w-40 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-slate-600"
          />
        </div>

        {/* Element filter */}
        <div className="relative">
          <select
            value={elementFilter ?? ''}
            onChange={e => setElementFilter(e.target.value || null)}
            className="appearance-none bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 pr-7 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">All Elements</option>
            {uniqueElements.map(el => (
              <option key={el} value={el}>{el}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>

        {/* Show/hide labels */}
        <button
          onClick={() => setShowLabels(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
            showLabels
              ? 'bg-blue-600/20 border-blue-600 text-blue-300'
              : 'bg-slate-800 border-slate-700 text-slate-500'
          }`}
        >
          {showLabels ? <Eye size={12} /> : <EyeOff size={12} />}
          Labels
        </button>

        {/* Active filters indicator */}
        {(diameterFilter !== null || markSearch || elementFilter !== null) && (
          <button
            onClick={() => { setDiameterFilter(null); setMarkSearch(''); setElementFilter(null) }}
            className="text-[10px] text-slate-500 hover:text-slate-300 px-2 py-1 rounded bg-slate-800 border border-slate-700"
          >
            Clear filters ({filteredBars.length}/{allDisplayBars.length})
          </button>
        )}

        {/* Diameter color legend */}
        <div className="ml-auto flex items-center gap-1.5">
          {presentDiameters.map(d => {
            const color = getDiameterColor(d)
            return (
              <button
                key={d}
                onClick={() => setDiameterFilter(prev => prev === d ? null : d)}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                  diameterFilter === d ? color.badge + ' ring-1 ' + color.ring : color.badge
                }`}
              >
                T{d}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r border-slate-800 overflow-hidden shrink-0 flex flex-col">
          {/* Sidebar tabs */}
          <div className="flex border-b border-slate-800 shrink-0">
            <button
              onClick={() => setSidebarTab('bars')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                sidebarTab === 'bars' ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Bar Marks ({filteredBars.length})
            </button>
            <button
              onClick={() => setSidebarTab('drawings')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                sidebarTab === 'drawings' ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Drawings ({drawings.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {sidebarTab === 'drawings' && (
              <>
                {/* Drawing selector */}
                {drawings.length > 0 && (
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
                              ? 'bg-blue-600/20 border border-blue-600 text-blue-200'
                              : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FileText size={12} className={isSelected ? 'text-blue-400' : 'text-slate-600'} />
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
                )}

                {drawings.length === 0 && (
                  <label className="block">
                    <span className="text-xs text-slate-400 uppercase tracking-wide">Upload Drawing</span>
                    <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="mt-1 block w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:text-xs file:cursor-pointer" />
                  </label>
                )}

                {/* Page selector */}
                {totalPages > 1 && (
                  <div className="flex gap-1 flex-wrap">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => switchPage(p)}
                        className={`px-2 py-1 text-xs rounded ${currentPage === p ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
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
                    Min confidence: <strong className="text-blue-400">{confidenceFilter}%</strong>
                  </label>
                  <input type="range" min={0} max={100} step={5} value={confidenceFilter}
                    onChange={e => setConfidenceFilter(Number(e.target.value))}
                    className="w-full accent-blue-500" />
                </div>

                {imageUrl && selectedDrawingId && (
                  <div className="flex flex-col gap-1.5">
                    <button onClick={() => placeLabelsForDrawing(selectedDrawingId)} className="w-full px-3 py-2 text-sm rounded bg-blue-700 hover:bg-blue-600 text-white font-medium">
                      Auto Place Markers Again
                    </button>
                    <button onClick={exportPDF} className="w-full px-3 py-2 text-sm rounded bg-green-700 hover:bg-green-600 text-white font-medium">
                      Export Marked Drawing PDF
                    </button>
                  </div>
                )}
              </>
            )}

            {sidebarTab === 'bars' && (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-800/60 rounded-lg px-3 py-2 text-center">
                    <div className="text-lg font-bold text-white">{filteredBars.length}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Marks</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg px-3 py-2 text-center">
                    <div className="text-lg font-bold text-blue-400">{totalQty}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Qty</div>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg px-3 py-2 text-center">
                    <div className="text-lg font-bold text-amber-400">{totalWeight > 0 ? totalWeight.toFixed(0) : '--'}</div>
                    <div className="text-[10px] text-slate-500 uppercase">kg</div>
                  </div>
                </div>

                {/* Placement progress */}
                {selectedDrawingId && (
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-slate-600">Placed:</span>
                    <span className={placedCount === allDisplayBars.length ? 'text-green-400' : 'text-blue-400'}>
                      {placedCount}/{allDisplayBars.length}
                    </span>
                    <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${(placedCount / Math.max(1, allDisplayBars.length)) * 100}%` }} />
                    </div>
                  </div>
                )}

                {/* Bar list */}
                <div className="space-y-0.5">
                  {filteredBars.map(bm => {
                    const placed = barsWithLabels.has(bm.id)
                    const isActive = activeBarId === bm.id
                    const isLinked = !!bm.sourceDrawingId
                    const hasBbox = !!bm.bbox
                    const color = getDiameterColor(bm.diameter)
                    const isCurrentlyPlacing = placingBarId === bm.id

                    return (
                      <div key={bm.id} id={`bar-btn-${bm.id}`} className="flex items-center gap-1">
                        <button
                          onClick={() => placed ? highlightBar(bm.id) : setPlacingBarId(bm.id)}
                          className={`flex-1 text-left px-2 py-2 text-xs rounded-lg flex items-center gap-2 transition-all ${
                            isCurrentlyPlacing ? 'bg-cyan-600/30 ring-1 ring-cyan-500 text-cyan-200 animate-pulse' :
                            isActive ? 'bg-blue-600/20 ring-1 ring-blue-500 text-blue-200 shadow-lg shadow-blue-500/20' :
                            placed ? 'bg-slate-800/80 hover:bg-slate-700/80' : 'bg-slate-800/30 hover:bg-slate-700/50 opacity-60'
                          }`}
                        >
                          {/* Diameter color dot */}
                          <span className={`w-2 h-2 rounded-full shrink-0 ${color.bg}`} />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-blue-400">{bm.mark}</span>
                              <span className={`text-[10px] font-mono px-1 rounded border ${color.badge}`}>T{bm.diameter}</span>
                              <span className="text-slate-600 text-[10px] ml-auto">{bm.element}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-[10px]">
                              <span className="text-slate-500">Qty: <span className="text-slate-300">{bm.quantity}</span></span>
                              {bm.weight != null && bm.weight > 0 && (
                                <span className="text-slate-500">Wt: <span className="text-amber-400">{bm.weight.toFixed(1)}kg</span></span>
                              )}
                              {bm.confidence != null && bm.confidence < 80 && (
                                <span className={`px-1 rounded ${
                                  bm.confidence >= 60 ? 'bg-amber-900/50 text-amber-400' : 'bg-red-900/50 text-red-400'
                                }`}>{bm.confidence}%</span>
                              )}
                            </div>
                          </div>

                          {placed ? (
                            <span className="text-green-500 text-xs shrink-0">&#9679;</span>
                          ) : isCurrentlyPlacing ? (
                            <span className="text-cyan-400 text-[10px] shrink-0">click drawing</span>
                          ) : (
                            <span className="text-[10px] text-slate-600 shrink-0">&#9768;</span>
                          )}
                        </button>
                        {placed && (
                          <button onClick={() => highlightBar(bm.id)} className="text-[10px] text-slate-600 hover:text-blue-400 px-1" title="Zoom to marker">&#8982;</button>
                        )}
                      </div>
                    )
                  })}

                  {filteredBars.length === 0 && (
                    <div className="text-center py-8 text-slate-600 text-sm">
                      No bars match the current filters
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="px-3 py-2 border-t border-slate-800 text-[10px] text-slate-600 shrink-0">
            Click bar to zoom. Alt+drag to pan. Scroll to zoom. Drag labels to reposition.
          </div>
        </div>

        {/* Canvas area */}
        <div
          ref={containerRef}
          className={`flex-1 overflow-hidden relative bg-slate-900 ${placingBarId ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {placingBarId && (() => {
            const bm = barMarks.find(b => b.id === placingBarId)
            return bm ? (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-semibold shadow-lg flex items-center gap-3">
                Click on the drawing to place: <span className="font-mono">{bm.mark} T{bm.diameter} x{bm.quantity}</span>
                <button onClick={() => setPlacingBarId(null)} className="text-cyan-200 hover:text-white ml-2">Cancel</button>
              </div>
            ) : null
          })()}
          {renderingPdf && !imageUrl ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <Loader2 size={32} className="animate-spin mx-auto mb-3 text-blue-500" />
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
                  <span className="px-4 py-2 rounded bg-blue-600 text-white text-sm cursor-pointer hover:bg-blue-500">Upload drawing manually</span>
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
                cursor: placingBarId ? 'crosshair' : undefined,
              }}
              className="relative inline-block"
              onClick={handleCanvasClick}
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
              {showLabels && visibleLabels.map(label => {
                const isActive = activeBarId === label.barId
                const isFlashing = label.flashing
                const color = getDiameterColor(label.diameter)
                return (
                  <div
                    key={label.barId}
                    className={`absolute select-none group`}
                    style={{
                      left: `${label.x}%`,
                      top: `${label.y}%`,
                      transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                      zIndex: isActive ? 20 : 10,
                    }}
                    onMouseDown={e => startLabelDrag(e, label.barId)}
                    onClick={(e) => { e.stopPropagation(); handleMarkerClick(label.barId) }}
                  >
                    {/* Glow ring for active/flashing */}
                    {(isActive || isFlashing) && (
                      <div
                        className={`absolute inset-0 -m-2 rounded-lg ${isFlashing ? 'animate-ping' : 'animate-pulse'} opacity-40 ${color.bg}`}
                        style={{ zIndex: -1 }}
                      />
                    )}
                    <div className={`px-2 py-0.5 rounded text-xs font-mono font-bold whitespace-nowrap cursor-move transition-all ${
                      isFlashing
                        ? `${color.bg} ${color.text} ring-2 ${color.ring} shadow-lg ${color.glow} scale-125`
                        : isActive
                        ? `${color.bg} ${color.text} ring-2 ${color.ring} shadow-lg ${color.glow}`
                        : `${color.bg} ${color.text} shadow-md`
                    }`}>
                      {label.mark} T{label.diameter} x{label.quantity}
                      <button
                        onClick={e => { e.stopPropagation(); removeLabel(label.barId) }}
                        className="ml-1.5 opacity-0 group-hover:opacity-100 hover:opacity-80"
                      >x</button>
                    </div>
                    {/* Pointer line from label to exact position */}
                    {isActive && (
                      <div className={`absolute left-1/2 top-full w-0.5 h-4 -translate-x-1/2 ${color.bg}`} />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
