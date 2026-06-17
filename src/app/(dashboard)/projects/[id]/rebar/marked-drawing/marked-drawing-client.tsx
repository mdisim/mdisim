'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n/use-translation'

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
}

export function MarkedDrawingClient({ barMarks, pageImages }: Props) {
  const { t } = useTranslation()
  const [imageUrl, setImageUrl] = useState<string | null>(pageImages[0]?.url ?? null)
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(
    pageImages[0] ? { w: pageImages[0].width, h: pageImages[0].height } : null
  )
  const [currentPage, setCurrentPage] = useState(pageImages[0]?.page ?? 1)
  const [labels, setLabels] = useState<PlacedLabel[]>(() => initLabelsFromBbox(barMarks, pageImages))
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [dragLabel, setDragLabel] = useState<string | null>(null)
  const [activeBarId, setActiveBarId] = useState<string | null>(null)
  const [confidenceFilter, setConfidenceFilter] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const hasAutoImage = pageImages.length > 0

  function switchPage(page: number) {
    const pi = pageImages.find(p => p.page === page)
    if (pi) {
      setImageUrl(pi.url)
      setImageSize({ w: pi.width, h: pi.height })
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

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-slate-800 p-4 overflow-y-auto shrink-0 flex flex-col gap-4">
        {!hasAutoImage && (
          <label className="block">
            <span className="text-xs text-slate-400 uppercase tracking-wide">Upload Drawing</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="mt-1 block w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-amber-600 file:text-white file:text-xs file:cursor-pointer" />
          </label>
        )}

        {hasAutoImage && (
          <div className="bg-green-900/20 border border-green-800 rounded p-2 text-xs text-green-400">
            Drawing auto-loaded from OCR extraction
          </div>
        )}

        {pageImages.length > 1 && (
          <div className="flex gap-1 flex-wrap">
            {pageImages.map(pi => (
              <button key={pi.page} onClick={() => switchPage(pi.page)}
                className={`px-2 py-1 text-xs rounded ${currentPage === pi.page ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                P{pi.page}
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
                onClick={() => placed ? highlightBar(bm.id) : addLabel(bm)}
                className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center gap-2 transition-colors ${
                  isActive ? 'bg-amber-600/30 ring-1 ring-amber-500 text-amber-200' :
                  placed ? 'bg-slate-800/80 hover:bg-slate-700' : 'bg-slate-800/30 hover:bg-slate-700 opacity-60'
                }`}
              >
                <span className="font-mono font-bold text-amber-400">{bm.mark}</span>
                <span className="text-slate-500">T{bm.diameter}</span>
                <span className="text-slate-600">×{bm.quantity}</span>
                {bm.confidence != null && bm.confidence < 80 && (
                  <span className={`ml-auto text-[10px] px-1 rounded ${
                    bm.confidence >= 60 ? 'bg-amber-900/50 text-amber-400' : 'bg-red-900/50 text-red-400'
                  }`}>{bm.confidence}%</span>
                )}
                {placed && <span className="ml-auto text-green-500 text-[10px]">●</span>}
              </button>
            )
          })}
        </div>

        <p className="text-[10px] text-slate-600">Alt+drag to pan. Scroll to zoom. Drag labels to reposition. Click bar to highlight.</p>
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
        {!imageUrl ? (
          <div className="flex items-center justify-center h-full text-slate-600">
            <div className="text-center">
              <p className="text-lg mb-2">No drawing available</p>
              <p className="text-sm">Run OCR extraction first, or upload a drawing manually</p>
            </div>
          </div>
        ) : (
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
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
