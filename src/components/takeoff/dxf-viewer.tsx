'use client'

import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { parseDXF, aciToHex } from '@/lib/dxf-parser'

interface DXFViewerProps {
  content: string
  drawingId: string
  projectId: string
}

export function DXFViewer({ content }: DXFViewerProps) {
  const parsed = useMemo(() => parseDXF(content), [content])

  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const layer of parsed.layers) initial[layer.name] = layer.visible
    // ensure default layer '0' is visible
    if (!('0' in initial)) initial['0'] = true
    return initial
  })

  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const toggleLayer = useCallback((name: string) => {
    setLayerVisibility(prev => ({ ...prev, [name]: !prev[name] }))
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const canvasW = container.clientWidth
    const canvasH = container.clientHeight
    canvas.width = canvasW
    canvas.height = canvasH

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, canvasW, canvasH)

    const { extents, entities, layers } = parsed

    const drawW = extents.maxX - extents.minX || 1
    const drawH = extents.maxY - extents.minY || 1
    const fitScale = Math.min(canvasW / drawW, canvasH / drawH) * 0.9
    const totalScale = fitScale * scale
    const ox = (canvasW - drawW * totalScale) / 2 + offset.x - extents.minX * totalScale
    const oy = (canvasH - drawH * totalScale) / 2 + offset.y + extents.maxY * totalScale

    const toScreenX = (x: number) => ox + x * totalScale
    const toScreenY = (y: number) => oy - y * totalScale

    for (const entity of entities) {
      // Layer visibility
      const vis = layerVisibility[entity.layer]
      if (vis === false) continue

      // Color resolution
      const layerDef = layers.find(l => l.name === entity.layer)
      const rawColor = entity.color ?? layerDef?.color ?? 7
      let color = aciToHex(rawColor)
      // color 7 = white — swap to off-white for dark bg
      if (rawColor === 7 || color === '#FFFFFF') color = '#e2e8f0'

      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = 1

      if (entity.type === 'LINE') {
        const s = entity.start
        const e = entity.end
        if (!s || !e) continue
        ctx.beginPath()
        ctx.moveTo(toScreenX(s.x), toScreenY(s.y))
        ctx.lineTo(toScreenX(e.x), toScreenY(e.y))
        ctx.stroke()

      } else if (entity.type === 'LWPOLYLINE') {
        const verts = entity.vertices
        if (!verts || verts.length < 2) continue
        ctx.beginPath()
        ctx.moveTo(toScreenX(verts[0].x), toScreenY(verts[0].y))
        for (let i = 1; i < verts.length; i++) {
          ctx.lineTo(toScreenX(verts[i].x), toScreenY(verts[i].y))
        }
        if (entity.closed) ctx.closePath()
        ctx.stroke()

      } else if (entity.type === 'CIRCLE') {
        const c = entity.center
        const r = entity.radius
        if (!c || r == null) continue
        ctx.beginPath()
        ctx.arc(toScreenX(c.x), toScreenY(c.y), r * totalScale, 0, Math.PI * 2)
        ctx.stroke()

      } else if (entity.type === 'ARC') {
        const c = entity.center
        const r = entity.radius
        const sa = entity.startAngle
        const ea = entity.endAngle
        if (!c || r == null || sa == null || ea == null) continue
        // DXF angles are CCW from +X; canvas angles are CW from +X, Y-inverted
        const startRad = -(sa * Math.PI) / 180
        const endRad = -(ea * Math.PI) / 180
        ctx.beginPath()
        ctx.arc(toScreenX(c.x), toScreenY(c.y), r * totalScale, startRad, endRad, true)
        ctx.stroke()

      } else if (entity.type === 'TEXT' || entity.type === 'MTEXT') {
        const verts = entity.vertices
        if (!verts || verts.length === 0) continue
        const pos = verts[0]
        ctx.font = '12px monospace'
        ctx.fillText(entity.text ?? '', toScreenX(pos.x), toScreenY(pos.y))

      } else if (entity.type === 'DIMENSION') {
        const verts = entity.vertices
        if (!verts || verts.length === 0) continue
        const pos = verts[0]
        ctx.font = '11px monospace'
        ctx.fillText(entity.text ?? '', toScreenX(pos.x), toScreenY(pos.y))
      }
    }
  }, [parsed, layerVisibility, offset, scale])

  // ResizeObserver to re-render on container resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => {
      // trigger re-render by forcing a state update isn't needed —
      // just re-run the draw effect by calling it directly via a no-op state nudge
      setOffset(o => ({ ...o }))
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }, [offset])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setScale(s => {
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      return Math.min(20, Math.max(0.1, s * factor))
    })
  }, [])

  const displayLayers = parsed.layers.length > 0
    ? parsed.layers
    : [{ name: '0', color: 7, lineType: 'CONTINUOUS', visible: true }]

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Layer panel */}
      <div className="w-48 shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-700">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Layers</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {displayLayers.map(layer => {
            const visible = layerVisibility[layer.name] !== false
            const swatch = aciToHex(layer.color)
            return (
              <div
                key={layer.name}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700/50 cursor-pointer"
                onClick={() => toggleLayer(layer.name)}
              >
                <div
                  className="w-3 h-3 rounded-sm shrink-0 border border-slate-600"
                  style={{ backgroundColor: swatch === '#FFFFFF' ? '#e2e8f0' : swatch }}
                />
                <span className={`flex-1 text-xs truncate ${visible ? 'text-slate-200' : 'text-slate-500'}`}>
                  {layer.name}
                </span>
                <span className="text-slate-500 shrink-0">
                  {visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-slate-800">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
      </div>
    </div>
  )
}
