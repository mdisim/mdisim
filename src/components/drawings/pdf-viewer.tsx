'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'

interface PdfViewerProps {
  url: string
}

export function PdfViewer({ url }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdf, setPdf] = useState<unknown>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.5)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Panning state
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const offsetStart = useRef({ x: 0, y: 0 })

  useEffect(() => {
    let cancelled = false
    async function loadPdf() {
      try {
        setLoading(true)
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

        const doc = await pdfjsLib.getDocument({ url }).promise
        if (!cancelled) {
          setPdf(doc)
          setTotalPages(doc.numPages)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load PDF')
          setLoading(false)
        }
      }
    }
    loadPdf()
    return () => { cancelled = true }
  }, [url])

  const renderPage = useCallback(async () => {
    if (!pdf || !canvasRef.current) return
    const pdfDoc = pdf as { getPage: (n: number) => Promise<{ getViewport: (opts: { scale: number }) => { width: number; height: number }; render: (ctx: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> } }> }
    const pg = await pdfDoc.getPage(page)
    const viewport = pg.getViewport({ scale })
    const canvas = canvasRef.current
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await pg.render({ canvasContext: ctx, viewport }).promise
  }, [pdf, page, scale])

  useEffect(() => { renderPage() }, [renderPage])

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY }
    offsetStart.current = offset
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    setOffset({
      x: offsetStart.current.x + (e.clientX - dragStart.current.x),
      y: offsetStart.current.y + (e.clientY - dragStart.current.y),
    })
  }

  const handleMouseUp = () => setDragging(false)

  const fitToWidth = () => {
    if (!containerRef.current) return
    setScale(containerRef.current.clientWidth / 612)
    setOffset({ x: 0, y: 0 })
  }

  if (error) {
    return <div className="text-center py-10 text-red-500 text-sm">{error}</div>
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-slate-100 rounded-lg px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-slate-600 min-w-[80px] text-center">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setScale(Math.max(0.5, scale - 0.25)); setOffset({ x: 0, y: 0 }) }}
            className="p-1.5 rounded hover:bg-slate-200 transition-colors"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs text-slate-500 min-w-[48px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => { setScale(Math.min(4, scale + 0.25)); setOffset({ x: 0, y: 0 }) }}
            className="p-1.5 rounded hover:bg-slate-200 transition-colors"
          >
            <ZoomIn size={16} />
          </button>
          <button onClick={fitToWidth} className="p-1.5 rounded hover:bg-slate-200 transition-colors ml-1" title="Fit width">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="relative overflow-hidden bg-slate-200 rounded-lg"
        style={{ height: '70vh', cursor: dragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              transformOrigin: '0 0',
            }}
          />
        )}
      </div>
    </div>
  )
}
