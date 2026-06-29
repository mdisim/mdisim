/**
 * DXF file parser and canvas renderer.
 * Parses DXF content using dxf-parser and renders entities to a canvas.
 */
import DxfParser from 'dxf-parser'

// AutoCAD Color Index (ACI) — first 10 standard colors
const ACI_COLORS: Record<number, string> = {
  0: '#000000',
  1: '#FF0000',
  2: '#FFFF00',
  3: '#00FF00',
  4: '#00FFFF',
  5: '#0000FF',
  6: '#FF00FF',
  7: '#FFFFFF',
  8: '#808080',
  9: '#C0C0C0',
}

function aciToHex(colorIndex: number): string {
  return ACI_COLORS[colorIndex] ?? '#CCCCCC'
}

export interface DxfBoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export interface ParsedDxf {
  entities: unknown[]
  layers: Record<string, { color: number; name: string }>
  boundingBox: DxfBoundingBox
}

function expandBB(bb: DxfBoundingBox, x: number, y: number) {
  if (x < bb.minX) bb.minX = x
  if (x > bb.maxX) bb.maxX = x
  if (y < bb.minY) bb.minY = y
  if (y > bb.maxY) bb.maxY = y
}

/** Parse DXF text content and return structured data */
export function parseDxfContent(dxfText: string): ParsedDxf {
  const parser = new DxfParser()
  const dxf = parser.parseSync(dxfText)
  if (!dxf) throw new Error('Failed to parse DXF file')

  const layers: Record<string, { color: number; name: string }> = {}
  if (dxf.tables?.layer?.layers) {
    for (const [name, layer] of Object.entries(dxf.tables.layer.layers as Record<string, { color?: number; name?: string }>)) {
      layers[name] = { color: (layer as { color?: number }).color ?? 7, name }
    }
  }

  const bb: DxfBoundingBox = {
    minX: Infinity, minY: Infinity,
    maxX: -Infinity, maxY: -Infinity,
    width: 0, height: 0,
  }

  const entities = dxf.entities ?? []

  for (const entity of entities as unknown as Array<Record<string, unknown>>) {
    const type = entity.type as string
    if (type === 'LINE') {
      const vs = entity.vertices as Array<{ x: number; y: number }> | undefined
      if (vs && vs.length >= 2) {
        expandBB(bb, vs[0].x, vs[0].y)
        expandBB(bb, vs[1].x, vs[1].y)
      }
    } else if (type === 'CIRCLE' || type === 'ARC') {
      const cx = (entity.center as { x: number; y: number })?.x ?? 0
      const cy = (entity.center as { x: number; y: number })?.y ?? 0
      const r = (entity.radius as number) ?? 0
      expandBB(bb, cx - r, cy - r)
      expandBB(bb, cx + r, cy + r)
    } else if (type === 'POLYLINE' || type === 'LWPOLYLINE') {
      const verts = entity.vertices as Array<{ x: number; y: number }> | undefined
      if (verts) {
        for (const v of verts) expandBB(bb, v.x, v.y)
      }
    } else if (type === 'TEXT' || type === 'MTEXT') {
      const pos = (entity.position ?? entity.startPoint) as { x: number; y: number } | undefined
      if (pos) expandBB(bb, pos.x, pos.y)
    } else if (type === 'ELLIPSE') {
      const center = entity.center as { x: number; y: number } | undefined
      const majorAxis = entity.majorAxisEndPoint as { x: number; y: number } | undefined
      if (center && majorAxis) {
        const majorLen = Math.sqrt(majorAxis.x ** 2 + majorAxis.y ** 2)
        expandBB(bb, center.x - majorLen, center.y - majorLen)
        expandBB(bb, center.x + majorLen, center.y + majorLen)
      }
    } else if (type === 'SPLINE') {
      const controlPoints = entity.controlPoints as Array<{ x: number; y: number }> | undefined
      if (controlPoints) {
        for (const cp of controlPoints) expandBB(bb, cp.x, cp.y)
      }
    } else if (type === 'DIMENSION') {
      const anchorPoint = entity.anchorPoint as { x: number; y: number } | undefined
      if (anchorPoint) expandBB(bb, anchorPoint.x, anchorPoint.y)
      const defPoint = entity.definitionPoint as { x: number; y: number } | undefined
      if (defPoint) expandBB(bb, defPoint.x, defPoint.y)
    } else if (type === 'INSERT') {
      const pos = entity.position as { x: number; y: number } | undefined
      if (pos) expandBB(bb, pos.x, pos.y)
    } else if (type === 'POINT') {
      const pos = entity.position as { x: number; y: number } | undefined
      if (pos) expandBB(bb, pos.x, pos.y)
    }
  }

  if (!isFinite(bb.minX)) {
    bb.minX = 0; bb.minY = 0; bb.maxX = 1000; bb.maxY = 1000
  }

  bb.width = bb.maxX - bb.minX
  bb.height = bb.maxY - bb.minY

  const pad = Math.max(bb.width, bb.height) * 0.02
  bb.minX -= pad
  bb.minY -= pad
  bb.maxX += pad
  bb.maxY += pad
  bb.width = bb.maxX - bb.minX
  bb.height = bb.maxY - bb.minY

  return { entities, layers, boundingBox: bb }
}

function getEntityColor(entity: Record<string, unknown>, layers: Record<string, { color: number }>): string {
  if (typeof entity.color === 'number' && entity.color > 0) {
    return aciToHex(entity.color as number)
  }
  const layerName = entity.layer as string
  if (layerName && layers[layerName]) {
    return aciToHex(layers[layerName].color)
  }
  return '#CCCCCC'
}

/** Render parsed DXF entities onto a canvas context */
export function renderDxfToCanvas(
  ctx: CanvasRenderingContext2D,
  parsed: ParsedDxf,
  canvasWidth: number,
  canvasHeight: number,
) {
  const { boundingBox: bb, entities, layers } = parsed

  const scaleX = canvasWidth / bb.width
  const scaleY = canvasHeight / bb.height
  const fitScale = Math.min(scaleX, scaleY) * 0.9

  // DXF Y axis is up, canvas Y axis is down
  const toCanvasX = (x: number) => (x - bb.minX) * fitScale + (canvasWidth - bb.width * fitScale) / 2
  const toCanvasY = (y: number) => canvasHeight - ((y - bb.minY) * fitScale + (canvasHeight - bb.height * fitScale) / 2)

  ctx.fillStyle = '#1e293b'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  ctx.lineWidth = 1
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (const entity of entities as unknown as Array<Record<string, unknown>>) {
    const type = entity.type as string
    const color = getEntityColor(entity, layers)
    ctx.strokeStyle = color
    ctx.fillStyle = color

    switch (type) {
      case 'LINE': {
        const vs = entity.vertices as Array<{ x: number; y: number }> | undefined
        if (vs && vs.length >= 2) {
          ctx.beginPath()
          ctx.moveTo(toCanvasX(vs[0].x), toCanvasY(vs[0].y))
          ctx.lineTo(toCanvasX(vs[1].x), toCanvasY(vs[1].y))
          ctx.stroke()
        }
        break
      }
      case 'CIRCLE': {
        const center = entity.center as { x: number; y: number }
        const r = (entity.radius as number) ?? 0
        if (center) {
          ctx.beginPath()
          ctx.arc(toCanvasX(center.x), toCanvasY(center.y), r * fitScale, 0, Math.PI * 2)
          ctx.stroke()
        }
        break
      }
      case 'ARC': {
        const center = entity.center as { x: number; y: number }
        const r = (entity.radius as number) ?? 0
        const startAngle = (entity.startAngle as number) ?? 0
        const endAngle = (entity.endAngle as number) ?? 360
        if (center) {
          const sa = -((endAngle * Math.PI) / 180)
          const ea = -((startAngle * Math.PI) / 180)
          ctx.beginPath()
          ctx.arc(toCanvasX(center.x), toCanvasY(center.y), r * fitScale, sa, ea)
          ctx.stroke()
        }
        break
      }
      case 'POLYLINE':
      case 'LWPOLYLINE': {
        const verts = entity.vertices as Array<{ x: number; y: number }> | undefined
        if (verts && verts.length >= 2) {
          ctx.beginPath()
          ctx.moveTo(toCanvasX(verts[0].x), toCanvasY(verts[0].y))
          for (let i = 1; i < verts.length; i++) {
            ctx.lineTo(toCanvasX(verts[i].x), toCanvasY(verts[i].y))
          }
          if (entity.shape) ctx.closePath()
          ctx.stroke()
        }
        break
      }
      case 'TEXT':
      case 'MTEXT': {
        const pos = (entity.position ?? entity.startPoint) as { x: number; y: number } | undefined
        const text = (entity.text ?? entity.string) as string | undefined
        const textHeight = (entity.height ?? entity.nominalTextHeight ?? 2.5) as number
        if (pos && text) {
          const fontSize = Math.max(8, Math.min(24, textHeight * fitScale))
          ctx.font = `${fontSize}px monospace`
          ctx.fillText(text, toCanvasX(pos.x), toCanvasY(pos.y))
        }
        break
      }
      case 'DIMENSION': {
        const anchorPoint = entity.anchorPoint as { x: number; y: number } | undefined
        const defPoint = entity.definitionPoint as { x: number; y: number } | undefined
        if (anchorPoint && defPoint) {
          ctx.beginPath()
          ctx.setLineDash([4, 4])
          ctx.moveTo(toCanvasX(anchorPoint.x), toCanvasY(anchorPoint.y))
          ctx.lineTo(toCanvasX(defPoint.x), toCanvasY(defPoint.y))
          ctx.stroke()
          ctx.setLineDash([])
          const dimText = entity.text as string | undefined
          if (dimText) {
            const mx = (toCanvasX(anchorPoint.x) + toCanvasX(defPoint.x)) / 2
            const my = (toCanvasY(anchorPoint.y) + toCanvasY(defPoint.y)) / 2
            ctx.font = '10px monospace'
            ctx.fillText(dimText, mx, my - 4)
          }
        }
        break
      }
      case 'ELLIPSE': {
        const center = entity.center as { x: number; y: number } | undefined
        const majorAxis = entity.majorAxisEndPoint as { x: number; y: number } | undefined
        const ratio = (entity.axisRatio as number) ?? 1
        if (center && majorAxis) {
          const majorLen = Math.sqrt(majorAxis.x ** 2 + majorAxis.y ** 2)
          const rotation = Math.atan2(majorAxis.y, majorAxis.x)
          ctx.beginPath()
          ctx.ellipse(
            toCanvasX(center.x), toCanvasY(center.y),
            majorLen * fitScale, majorLen * ratio * fitScale,
            -rotation, 0, Math.PI * 2,
          )
          ctx.stroke()
        }
        break
      }
      case 'SPLINE': {
        const controlPoints = entity.controlPoints as Array<{ x: number; y: number }> | undefined
        if (controlPoints && controlPoints.length >= 2) {
          ctx.beginPath()
          ctx.moveTo(toCanvasX(controlPoints[0].x), toCanvasY(controlPoints[0].y))
          if (controlPoints.length === 2) {
            ctx.lineTo(toCanvasX(controlPoints[1].x), toCanvasY(controlPoints[1].y))
          } else {
            for (let i = 1; i < controlPoints.length - 1; i++) {
              const cp = controlPoints[i]
              const next = controlPoints[i + 1]
              const mx = (toCanvasX(cp.x) + toCanvasX(next.x)) / 2
              const my = (toCanvasY(cp.y) + toCanvasY(next.y)) / 2
              ctx.quadraticCurveTo(toCanvasX(cp.x), toCanvasY(cp.y), mx, my)
            }
            const last = controlPoints[controlPoints.length - 1]
            ctx.lineTo(toCanvasX(last.x), toCanvasY(last.y))
          }
          ctx.stroke()
        }
        break
      }
      case 'INSERT': {
        const pos = entity.position as { x: number; y: number } | undefined
        if (pos) {
          const cx = toCanvasX(pos.x)
          const cy = toCanvasY(pos.y)
          ctx.beginPath()
          ctx.moveTo(cx - 4, cy - 4)
          ctx.lineTo(cx + 4, cy + 4)
          ctx.moveTo(cx + 4, cy - 4)
          ctx.lineTo(cx - 4, cy + 4)
          ctx.stroke()
        }
        break
      }
      case 'POINT': {
        const pos = entity.position as { x: number; y: number } | undefined
        if (pos) {
          ctx.beginPath()
          ctx.arc(toCanvasX(pos.x), toCanvasY(pos.y), 2, 0, Math.PI * 2)
          ctx.fill()
        }
        break
      }
    }
  }
}
