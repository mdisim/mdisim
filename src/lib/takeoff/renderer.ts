import type { Point } from './geometry'
import type { DrawingToolType } from '@/lib/types'

export interface TakeoffMeasurement {
  id: string
  tool_type: string
  coordinates: unknown
  quantity: number
  unit: string | null
  color: string | null
  label: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getColor(m: TakeoffMeasurement): string {
  return m.color ?? '#3B82F6'
}

function coordsToPoints(coords: unknown): Point[] {
  const c = coords as Record<string, unknown>
  if (c?.points && Array.isArray(c.points)) {
    return (c.points as number[][]).map(([x, y]) => ({ x, y }))
  }
  return []
}

function centroid(pts: Point[]): Point {
  if (pts.length === 0) return { x: 0, y: 0 }
  const sx = pts.reduce((s, p) => s + p.x, 0)
  const sy = pts.reduce((s, p) => s + p.y, 0)
  return { x: sx / pts.length, y: sy / pts.length }
}

function formatLabel(m: TakeoffMeasurement): string {
  if (m.label) return m.label
  const q = m.quantity % 1 === 0 ? m.quantity.toString() : m.quantity.toFixed(2)
  return m.unit ? `${q} ${m.unit}` : `${q} px`
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number,
) {
  const fontSize = Math.max(12, 14 / scale)
  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`
  const metrics = ctx.measureText(text)
  const pad = 4 / scale

  ctx.fillStyle = 'rgba(0,0,0,0.75)'
  ctx.beginPath()
  const rx = x - metrics.width / 2 - pad
  const ry = y - fontSize / 2 - pad
  const rw = metrics.width + pad * 2
  const rh = fontSize + pad * 2
  ctx.roundRect(rx, ry, rw, rh, 3 / scale)
  ctx.fill()

  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
}

function drawHandles(ctx: CanvasRenderingContext2D, points: Point[], scale: number) {
  const r = 4 / scale
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#3B82F6'
  ctx.lineWidth = 2 / scale
  for (const p of points) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
}

// ── Render individual measurement types ──────────────────────────────────

function renderLine(
  ctx: CanvasRenderingContext2D,
  m: TakeoffMeasurement,
  scale: number,
  active: boolean,
) {
  const pts = coordsToPoints(m.coordinates)
  if (pts.length < 2) return
  const color = getColor(m)
  ctx.strokeStyle = color
  ctx.lineWidth = (active ? 3 : 2) / scale
  ctx.setLineDash([6 / scale, 4 / scale])
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  ctx.lineTo(pts[1].x, pts[1].y)
  ctx.stroke()
  ctx.setLineDash([])

  const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
  drawLabel(ctx, formatLabel(m), mid.x, mid.y - 12 / scale, scale)
  if (active) drawHandles(ctx, pts, scale)
}

function renderPolyline(
  ctx: CanvasRenderingContext2D,
  m: TakeoffMeasurement,
  scale: number,
  active: boolean,
) {
  const pts = coordsToPoints(m.coordinates)
  if (pts.length < 2) return
  const color = getColor(m)
  ctx.strokeStyle = color
  ctx.lineWidth = (active ? 3 : 2) / scale
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  ctx.stroke()

  const c = centroid(pts)
  drawLabel(ctx, formatLabel(m), c.x, c.y - 12 / scale, scale)
  if (active) drawHandles(ctx, pts, scale)
}

function renderArea(
  ctx: CanvasRenderingContext2D,
  m: TakeoffMeasurement,
  scale: number,
  active: boolean,
) {
  const pts = coordsToPoints(m.coordinates)
  if (pts.length < 3) return
  const color = getColor(m)

  ctx.fillStyle = color + '30'
  ctx.strokeStyle = color
  ctx.lineWidth = (active ? 3 : 2) / scale
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  const c = centroid(pts)
  drawLabel(ctx, formatLabel(m), c.x, c.y, scale)
  if (active) drawHandles(ctx, pts, scale)
}

function renderRectangle(
  ctx: CanvasRenderingContext2D,
  m: TakeoffMeasurement,
  scale: number,
  active: boolean,
) {
  const c = m.coordinates as { origin: number[]; width: number; height: number }
  if (!c?.origin) return
  const [ox, oy] = c.origin
  const color = getColor(m)

  ctx.fillStyle = color + '30'
  ctx.strokeStyle = color
  ctx.lineWidth = (active ? 3 : 2) / scale
  ctx.fillRect(ox, oy, c.width, c.height)
  ctx.strokeRect(ox, oy, c.width, c.height)

  const cx = ox + c.width / 2
  const cy = oy + c.height / 2
  drawLabel(ctx, formatLabel(m), cx, cy, scale)
  if (active) {
    drawHandles(ctx, [
      { x: ox, y: oy },
      { x: ox + c.width, y: oy },
      { x: ox + c.width, y: oy + c.height },
      { x: ox, y: oy + c.height },
    ], scale)
  }
}

function renderCircle(
  ctx: CanvasRenderingContext2D,
  m: TakeoffMeasurement,
  scale: number,
  active: boolean,
) {
  const c = m.coordinates as { center: number[]; radius: number }
  if (!c?.center) return
  const [cx, cy] = c.center
  const color = getColor(m)

  ctx.fillStyle = color + '30'
  ctx.strokeStyle = color
  ctx.lineWidth = (active ? 3 : 2) / scale
  ctx.beginPath()
  ctx.arc(cx, cy, c.radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  drawLabel(ctx, formatLabel(m), cx, cy, scale)
  if (active) {
    drawHandles(ctx, [
      { x: cx, y: cy },
      { x: cx + c.radius, y: cy },
    ], scale)
  }
}

function renderCount(
  ctx: CanvasRenderingContext2D,
  m: TakeoffMeasurement,
  scale: number,
  active: boolean,
) {
  const pts = coordsToPoints(m.coordinates)
  const color = getColor(m)
  const r = 12 / scale

  pts.forEach((p, i) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fill()

    if (active) {
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2 / scale
      ctx.stroke()
    }

    const fontSize = Math.max(10, 12 / scale)
    ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(i + 1), p.x, p.y)
  })
}

// ── Public API ────────────────────────────────────────────────────────────

export function renderMeasurements(
  ctx: CanvasRenderingContext2D,
  measurements: TakeoffMeasurement[],
  scale: number,
  activeId?: string,
) {
  for (const m of measurements) {
    const active = m.id === activeId
    switch (m.tool_type) {
      case 'line': renderLine(ctx, m, scale, active); break
      case 'polyline': renderPolyline(ctx, m, scale, active); break
      case 'area': renderArea(ctx, m, scale, active); break
      case 'rectangle': renderRectangle(ctx, m, scale, active); break
      case 'circle': renderCircle(ctx, m, scale, active); break
      case 'count': renderCount(ctx, m, scale, active); break
    }
  }
}

export function renderActiveDrawing(
  ctx: CanvasRenderingContext2D,
  tool: DrawingToolType,
  points: Point[],
  scale: number,
  color: string,
) {
  if (points.length === 0) return

  ctx.strokeStyle = color
  ctx.fillStyle = color + '30'
  ctx.lineWidth = 2 / scale
  ctx.setLineDash([6 / scale, 4 / scale])

  switch (tool) {
    case 'line':
    case 'polyline': {
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
      ctx.stroke()
      break
    }
    case 'area': {
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
      if (points.length > 2) {
        ctx.closePath()
        ctx.fill()
      }
      ctx.stroke()
      break
    }
    case 'rectangle': {
      if (points.length === 2) {
        const w = points[1].x - points[0].x
        const h = points[1].y - points[0].y
        ctx.fillRect(points[0].x, points[0].y, w, h)
        ctx.strokeRect(points[0].x, points[0].y, w, h)
      }
      break
    }
    case 'circle': {
      if (points.length === 2) {
        const r = Math.sqrt(
          (points[1].x - points[0].x) ** 2 + (points[1].y - points[0].y) ** 2,
        )
        ctx.beginPath()
        ctx.arc(points[0].x, points[0].y, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
      break
    }
    case 'count': {
      const r = 12 / scale
      for (const p of points) {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
  }

  ctx.setLineDash([])
  drawHandles(ctx, points, scale)
}

export function renderCalibrationLine(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  scale: number,
) {
  if (points.length === 0) return

  ctx.strokeStyle = '#EF4444'
  ctx.lineWidth = 2 / scale
  ctx.setLineDash([8 / scale, 4 / scale])

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
  ctx.stroke()
  ctx.setLineDash([])

  // Draw crosshair at each point
  const size = 10 / scale
  for (const p of points) {
    ctx.strokeStyle = '#EF4444'
    ctx.lineWidth = 2 / scale
    ctx.beginPath()
    ctx.moveTo(p.x - size, p.y)
    ctx.lineTo(p.x + size, p.y)
    ctx.moveTo(p.x, p.y - size)
    ctx.lineTo(p.x, p.y + size)
    ctx.stroke()
  }
}

export function renderGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  spacing: number,
  scale: number,
) {
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'
  ctx.lineWidth = 1 / scale

  for (let x = 0; x <= width; x += spacing) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 0; y <= height; y += spacing) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}
