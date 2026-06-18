'use client'

import { useState, useRef, useEffect } from 'react'
import { Move } from 'lucide-react'

export interface PageRender {
  page: number
  dataUrl: string   // JPEG data URL from OCR canvas
  width: number     // canvas pixels
  height: number
}

export interface AnnotatedCallout {
  raw: string
  count: number
  diameterMm: number
  spacingMm?: number
  cutLengthMm?: number
  confidence: number
  page: number
  // Tesseract line bbox in canvas pixels (4× scale)
  x0: number; y0: number; x1: number; y1: number
  canvasW: number; canvasH: number
}

interface Props {
  pageRenders: PageRender[]
  callouts: AnnotatedCallout[]
  activeRaw: string | null
  labelOffsets: Record<string, { dx: number; dy: number }>
  onActivate: (raw: string | null) => void
  onLabelMove: (raw: string, dx: number, dy: number) => void
}

export function AnnotatedViewer({
  pageRenders, callouts, activeRaw, labelOffsets, onActivate, onLabelMove,
}: Props) {
  const [currentPage, setCurrentPage] = useState(pageRenders[0]?.page ?? 1)
  const imgRef = useRef<HTMLImageElement>(null)
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)

  const render = pageRenders.find(r => r.page === currentPage)
  const pageCallouts = callouts.filter(c => c.page === currentPage)

  useEffect(() => {
    const el = imgRef.current
    if (!el) return
    const obs = new ResizeObserver(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0)
        setImgSize({ w: el.clientWidth, h: el.clientHeight })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [render])

  if (!render) return <p className="text-slate-500 text-sm">No page renders available.</p>

  return (
    <div>
      {pageRenders.length > 1 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {pageRenders.map(r => (
            <button key={r.page} onClick={() => setCurrentPage(r.page)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                currentPage === r.page
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}>
              Page {r.page}
            </button>
          ))}
        </div>
      )}

      <div className="relative w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={render.dataUrl}
          alt={`Drawing page ${render.page}`}
          className="w-full block"
          onLoad={() => {
            const el = imgRef.current
            if (el) setImgSize({ w: el.clientWidth, h: el.clientHeight })
          }}
        />

        {imgSize && pageCallouts.map((ac, i) => {
          const scaleX = imgSize.w / ac.canvasW
          const scaleY = imgSize.h / ac.canvasH
          const off = labelOffsets[ac.raw] ?? { dx: 0, dy: 0 }
          const left = ac.x0 * scaleX + off.dx
          const top  = ac.y0 * scaleY + off.dy
          const isActive = activeRaw === ac.raw
          const label = `${ac.count}T${ac.diameterMm}${
            ac.cutLengthMm ? ` L=${ac.cutLengthMm}` : ''
          }${ac.spacingMm ? ` @${ac.spacingMm}` : ''}`

          return (
            <div
              key={i}
              style={{ position: 'absolute', left, top, userSelect: 'none', zIndex: isActive ? 20 : 10 }}
              className={`group flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-mono font-semibold cursor-grab whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-400 text-slate-900 ring-2 ring-white shadow-xl'
                  : ac.confidence >= 80
                  ? 'bg-amber-700/90 text-white hover:bg-amber-500'
                  : ac.confidence >= 60
                  ? 'bg-orange-700/90 text-white hover:bg-orange-500'
                  : 'bg-red-800/90 text-white hover:bg-red-600'
              }`}
              onPointerDown={e => {
                e.preventDefault()
                const el = e.currentTarget
                el.setPointerCapture(e.pointerId)
                const startX = e.clientX - (labelOffsets[ac.raw]?.dx ?? 0)
                const startY = e.clientY - (labelOffsets[ac.raw]?.dy ?? 0)
                let moved = false

                const onMove = (ev: PointerEvent) => {
                  moved = true
                  onLabelMove(ac.raw, ev.clientX - startX, ev.clientY - startY)
                }
                const onUp = () => {
                  el.removeEventListener('pointermove', onMove as EventListener)
                  el.removeEventListener('pointerup', onUp)
                  if (!moved) onActivate(isActive ? null : ac.raw)
                }
                el.addEventListener('pointermove', onMove as EventListener)
                el.addEventListener('pointerup', onUp)
              }}
            >
              <Move size={9} className="opacity-50 group-hover:opacity-100 shrink-0" />
              {label}
            </div>
          )
        })}
      </div>

      <p className="mt-1.5 text-xs text-slate-600">
        Click a label to highlight its BBS row. Drag to reposition.
        Colors: <span className="text-amber-400">amber ≥80%</span> · <span className="text-orange-400">orange 60–79%</span> · <span className="text-red-400">red &lt;60%</span> confidence.
      </p>
    </div>
  )
}

// ─── Export helper — composites page render + annotation labels onto canvas ───
export async function exportAnnotatedCanvas(
  render: PageRender,
  callouts: AnnotatedCallout[],
  offsets: Record<string, { dx: number; dy: number }>,
): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width  = render.width
  canvas.height = render.height
  const ctx = canvas.getContext('2d')!

  await new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => { ctx.drawImage(img, 0, 0); resolve() }
    img.onerror = reject
    img.src = render.dataUrl
  })

  const fontSize = Math.max(20, Math.round(render.width / 100))
  ctx.font = `bold ${fontSize}px monospace`

  for (const ac of callouts.filter(c => c.page === render.page)) {
    const off = offsets[ac.raw] ?? { dx: 0, dy: 0 }
    const x = ac.x0 + off.dx
    const y = ac.y0 + off.dy
    const label = `${ac.count}T${ac.diameterMm}${
      ac.cutLengthMm ? ` L=${ac.cutLengthMm}` : ''
    }${ac.spacingMm ? ` @${ac.spacingMm}` : ''}`

    const metrics = ctx.measureText(label)
    const labelW  = metrics.width + 14
    const labelH  = fontSize + 10

    // Background
    ctx.fillStyle = ac.confidence >= 80
      ? 'rgba(217,119,6,0.88)'
      : ac.confidence >= 60
      ? 'rgba(194,65,12,0.88)'
      : 'rgba(185,28,28,0.88)'
    ctx.fillRect(x, y, labelW, labelH)

    // Text
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, x + 7, y + fontSize + 1)
  }

  return canvas.toDataURL('image/jpeg', 0.92)
}
