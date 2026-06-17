'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface BarMark {
  mark: string
  diameter: number
  quantity: number
  element: string
}

interface PlacedLabel {
  id: string
  mark: string
  diameter: number
  quantity: number
  x: number // % of image width
  y: number // % of image height
}

interface Props {
  barMarks: BarMark[]
}

export function MarkedDrawingClient({ barMarks }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [labels, setLabels] = useState<PlacedLabel[]>([])
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [dragLabel, setDragLabel] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImageUrl(reader.result as string)
      setZoom(1)
      setPan({ x: 0, y: 0 })
      autoPlaceLabels()
    }
    reader.readAsDataURL(file)
  }

  const autoPlaceLabels = () => {
    const placed: PlacedLabel[] = barMarks.map((bm, i) => {
      const cols = Math.ceil(Math.sqrt(barMarks.length))
      const row = Math.floor(i / cols)
      const col = i % cols
      return {
        id: `${bm.mark}-${i}`,
        mark: bm.mark,
        diameter: bm.diameter,
        quantity: bm.quantity,
        x: 10 + (col * 80) / Math.max(cols, 1),
        y: 10 + (row * 80) / Math.max(Math.ceil(barMarks.length / cols), 1),
      }
    })
    setLabels(placed)
  }

  useEffect(() => {
    if (imageUrl && labels.length === 0 && barMarks.length > 0) {
      autoPlaceLabels()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl])

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
      const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100
      const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100
      setLabels(prev => prev.map(l => l.id === dragLabel ? { ...l, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : l))
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
    setDragLabel(null)
  }

  const startLabelDrag = (e: React.MouseEvent, labelId: string) => {
    e.stopPropagation()
    setDragLabel(labelId)
    setDragOffset({ x: 0, y: 0 })
  }

  const removeLabel = (id: string) => {
    setLabels(prev => prev.filter(l => l.id !== id))
  }

  const addLabel = (bm: BarMark) => {
    setLabels(prev => [...prev, {
      id: `${bm.mark}-${Date.now()}`,
      mark: bm.mark,
      diameter: bm.diameter,
      quantity: bm.quantity,
      x: 50,
      y: 50,
    }])
  }

  const exportPDF = async () => {
    if (!imgRef.current || !imageUrl) return
    const canvas = document.createElement('canvas')
    const img = imgRef.current
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(img, 0, 0)

    for (const label of labels) {
      const lx = (label.x / 100) * canvas.width
      const ly = (label.y / 100) * canvas.height
      const fontSize = Math.max(14, canvas.width * 0.015)
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
      <div className="w-64 border-r border-slate-800 p-4 overflow-y-auto shrink-0">
        <label className="block mb-4">
          <span className="text-xs text-slate-400 uppercase tracking-wide">Upload Drawing</span>
          <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="mt-1 block w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-amber-600 file:text-white file:text-xs file:cursor-pointer" />
        </label>

        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setZoom(z => Math.min(5, z + 0.25))} className="px-2 py-1 text-xs bg-slate-800 rounded hover:bg-slate-700">+</button>
          <span className="text-xs text-slate-400">{(zoom * 100).toFixed(0)}%</span>
          <button onClick={() => setZoom(z => Math.max(0.2, z - 0.25))} className="px-2 py-1 text-xs bg-slate-800 rounded hover:bg-slate-700">−</button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} className="px-2 py-1 text-xs bg-slate-800 rounded hover:bg-slate-700 ml-auto">Reset</button>
        </div>

        {imageUrl && (
          <button onClick={exportPDF} className="w-full mb-4 px-3 py-2 text-sm rounded bg-green-700 hover:bg-green-600 text-white font-medium">
            Export PDF
          </button>
        )}

        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Bar Marks</p>
        <div className="space-y-1">
          {barMarks.map((bm, i) => (
            <button
              key={`${bm.mark}-${i}`}
              onClick={() => addLabel(bm)}
              className="w-full text-left px-2 py-1.5 text-xs rounded bg-slate-800/50 hover:bg-slate-700 flex items-center gap-2"
            >
              <span className="font-mono font-bold text-amber-400">{bm.mark}</span>
              <span className="text-slate-500">T{bm.diameter}</span>
              <span className="text-slate-600 ml-auto">×{bm.quantity}</span>
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-600 mt-4">Alt+drag or middle-click to pan. Scroll to zoom. Drag labels to position.</p>
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
            <p className="text-lg">Upload a structural drawing to get started</p>
          </div>
        ) : (
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
            className="relative inline-block transition-transform duration-75"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Structural drawing"
              className="max-w-none select-none"
              draggable={false}
            />
            {labels.map(label => (
              <div
                key={label.id}
                className="absolute select-none group"
                style={{
                  left: `${label.x}%`,
                  top: `${label.y}%`,
                  transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                }}
                onMouseDown={e => startLabelDrag(e, label.id)}
              >
                <div className="bg-amber-500 text-black px-2 py-0.5 rounded text-xs font-mono font-bold whitespace-nowrap cursor-move shadow-lg">
                  {label.mark} T{label.diameter} ×{label.quantity}
                  <button
                    onClick={e => { e.stopPropagation(); removeLabel(label.id) }}
                    className="ml-1.5 text-amber-900 hover:text-red-700 opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}
