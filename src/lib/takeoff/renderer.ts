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

// ── Dimension / unit formatting helper ────────────────────────────────────

function formatDim(px: number, pxPerUnit: number, unit: string | null): string {
  if (pxPerUnit > 0 && unit) {
    return `${(px / pxPerUnit).toFixed(2)} ${unit}`
  }
  return `${px.toFixed(2)} px`
}

function dist(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

function polygonArea(pts: Point[]): number {
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y
  }
  return Math.abs(area / 2)
}

function formatArea(pxArea: number, pxPerUnit: number, unit: string | null): string {
  if (pxPerUnit > 0 && unit) {
    return `${(pxArea / (pxPerUnit * pxPerUnit)).toFixed(2)} ${unit}²`
  }
  return `${pxArea.toFixed(2)} px²`
}

// ── Snap indicator ───────────────────────────────────────────────────────

export function renderSnapIndicator(
  ctx: CanvasRenderingContext2D,
  snap: { point: { x: number; y: number }; type: string } | null,
  scale: number,
): void {
  if (!snap) return
  const { point, type } = snap
  const r = 8 / scale
  const color = '#F59E0B'

  ctx.save()
  ctx.strokeStyle = '#fff'
  ctx.fillStyle = color
  ctx.lineWidth = 2 / scale

  switch (type) {
    case 'endpoint': {
      // Circle with crosshair
      ctx.beginPath()
      ctx.arc(point.x, point.y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(point.x - r, point.y)
      ctx.lineTo(point.x + r, point.y)
      ctx.moveTo(point.x, point.y - r)
      ctx.lineTo(point.x, point.y + r)
      ctx.strokeStyle = color
      ctx.stroke()
      break
    }
    case 'midpoint': {
      // Diamond
      ctx.beginPath()
      ctx.moveTo(point.x, point.y - r)
      ctx.lineTo(point.x + r, point.y)
      ctx.lineTo(point.x, point.y + r)
      ctx.lineTo(point.x - r, point.y)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.stroke()
      break
    }
    case 'nearest': {
      // Smaller circle
      ctx.beginPath()
      ctx.arc(point.x, point.y, r * 0.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.stroke()
      break
    }
    case 'intersection': {
      ctx.strokeStyle = '#EF4444'
      ctx.lineWidth = 2 / scale
      ctx.beginPath()
      ctx.moveTo(point.x - r, point.y - r)
      ctx.lineTo(point.x + r, point.y + r)
      ctx.moveTo(point.x + r, point.y - r)
      ctx.lineTo(point.x - r, point.y + r)
      ctx.stroke()
      break
    }
    case 'perpendicular': {
      ctx.strokeStyle = '#06B6D4'
      ctx.lineWidth = 2 / scale
      ctx.beginPath()
      ctx.moveTo(point.x, point.y - r)
      ctx.lineTo(point.x, point.y)
      ctx.lineTo(point.x + r, point.y)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(point.x, point.y, r * 0.3, 0, Math.PI * 2)
      ctx.fillStyle = '#06B6D4'
      ctx.fill()
      break
    }
    case 'parallel': {
      ctx.strokeStyle = '#6366F1'
      ctx.lineWidth = 2 / scale
      const s = r * 0.7
      ctx.beginPath()
      ctx.moveTo(point.x - s, point.y - s * 0.3)
      ctx.lineTo(point.x + s, point.y - s * 0.3)
      ctx.moveTo(point.x - s, point.y + s * 0.3)
      ctx.lineTo(point.x + s, point.y + s * 0.3)
      ctx.stroke()
      break
    }
    case 'grid': {
      const s = r * 0.6
      ctx.strokeStyle = color
      ctx.lineWidth = 2 / scale
      ctx.beginPath()
      ctx.moveTo(point.x - s, point.y)
      ctx.lineTo(point.x + s, point.y)
      ctx.moveTo(point.x, point.y - s)
      ctx.lineTo(point.x, point.y + s)
      ctx.stroke()
      break
    }
  }

  ctx.restore()
}

// ── Live dimension display ───────────────────────────────────────────────

export function renderLiveDimension(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  tool: string,
  pxPerUnit: number,
  unit: string | null,
  scale: number,
): void {
  if (points.length < 2 && tool !== 'count') return

  ctx.save()

  switch (tool) {
    case 'line': {
      if (points.length < 2) break
      const d = dist(points[0], points[1])
      const mid = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }
      // Tick marks at endpoints
      const angle = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x)
      const perpX = Math.cos(angle + Math.PI / 2) * 6 / scale
      const perpY = Math.sin(angle + Math.PI / 2) * 6 / scale
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 1 / scale
      for (const p of [points[0], points[1]]) {
        ctx.beginPath()
        ctx.moveTo(p.x - perpX, p.y - perpY)
        ctx.lineTo(p.x + perpX, p.y + perpY)
        ctx.stroke()
      }
      drawLabel(ctx, formatDim(d, pxPerUnit, unit), mid.x, mid.y - 14 / scale, scale)
      break
    }
    case 'rectangle': {
      if (points.length < 2) break
      const w = Math.abs(points[1].x - points[0].x)
      const h = Math.abs(points[1].y - points[0].y)
      const minX = Math.min(points[0].x, points[1].x)
      const minY = Math.min(points[0].y, points[1].y)
      // Width label on top
      drawLabel(ctx, formatDim(w, pxPerUnit, unit), minX + w / 2, minY - 14 / scale, scale)
      // Height label on right
      drawLabel(ctx, formatDim(h, pxPerUnit, unit), minX + w + 14 / scale, minY + h / 2, scale)
      // Area in center
      const area = w * h
      drawLabel(ctx, formatArea(area, pxPerUnit, unit), minX + w / 2, minY + h / 2, scale)
      break
    }
    case 'circle': {
      if (points.length < 2) break
      const r = dist(points[0], points[1])
      // Radius line label
      const mid = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }
      drawLabel(ctx, 'r=' + formatDim(r, pxPerUnit, unit), mid.x, mid.y - 14 / scale, scale)
      // Area in center
      const area = Math.PI * r * r
      drawLabel(ctx, formatArea(area, pxPerUnit, unit), points[0].x, points[0].y, scale)
      break
    }
    case 'polyline': {
      if (points.length < 2) break
      let cumulative = 0
      for (let i = 1; i < points.length; i++) {
        const d = dist(points[i - 1], points[i])
        cumulative += d
        const mid = { x: (points[i - 1].x + points[i].x) / 2, y: (points[i - 1].y + points[i].y) / 2 }
        drawLabel(ctx, formatDim(d, pxPerUnit, unit), mid.x, mid.y - 14 / scale, scale)
      }
      // Cumulative at last segment midpoint
      if (points.length > 2) {
        const last = points[points.length - 1]
        drawLabel(ctx, 'Σ ' + formatDim(cumulative, pxPerUnit, unit), last.x, last.y + 14 / scale, scale)
      }
      break
    }
    case 'area': {
      if (points.length < 3) break
      // Edge lengths
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length
        const d = dist(points[i], points[j])
        const mid = { x: (points[i].x + points[j].x) / 2, y: (points[i].y + points[j].y) / 2 }
        drawLabel(ctx, formatDim(d, pxPerUnit, unit), mid.x, mid.y - 10 / scale, scale)
      }
      // Area in center
      const area = polygonArea(points)
      const c = centroid(points)
      drawLabel(ctx, formatArea(area, pxPerUnit, unit), c.x, c.y, scale)
      break
    }
  }

  ctx.restore()
}

// ── Angle guide ──────────────────────────────────────────────────────────

export function renderAngleGuide(
  ctx: CanvasRenderingContext2D,
  origin: { x: number; y: number },
  current: { x: number; y: number },
  previous: { x: number; y: number } | null,
  scale: number,
): void {
  ctx.save()

  const guideLen = 2000 / scale
  const angles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI]

  // Draw dashed guide lines at standard angles
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.lineWidth = 1 / scale
  ctx.setLineDash([4 / scale, 4 / scale])

  for (const a of angles) {
    const dx = Math.cos(a) * guideLen
    const dy = Math.sin(a) * guideLen
    ctx.beginPath()
    ctx.moveTo(origin.x - dx, origin.y - dy)
    ctx.lineTo(origin.x + dx, origin.y + dy)
    ctx.stroke()
  }

  ctx.setLineDash([])

  // If previous point exists, show angle arc
  if (previous) {
    const aPrev = Math.atan2(previous.y - origin.y, previous.x - origin.x)
    const aCurr = Math.atan2(current.y - origin.y, current.x - origin.x)
    let angleDeg = ((aCurr - aPrev) * 180) / Math.PI
    if (angleDeg < 0) angleDeg += 360

    const arcR = 30 / scale
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'
    ctx.lineWidth = 1.5 / scale
    ctx.beginPath()
    ctx.arc(origin.x, origin.y, arcR, aPrev, aCurr, angleDeg > 180)
    ctx.stroke()

    // Angle label
    const midAngle = aPrev + ((aCurr - aPrev) / 2)
    const labelX = origin.x + Math.cos(midAngle) * arcR * 1.6
    const labelY = origin.y + Math.sin(midAngle) * arcR * 1.6
    drawLabel(ctx, `${angleDeg.toFixed(1)}°`, labelX, labelY, scale)
  }

  ctx.restore()
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
  pxPerUnit?: number,
  unit?: string | null,
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

  // Show live dimensions while drawing
  if (pxPerUnit !== undefined) {
    renderLiveDimension(ctx, points, tool, pxPerUnit, unit ?? null, scale)
  }
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
  pxPerUnit?: number,
  unit?: string | null,
) {
  const fontSize = Math.max(9, 10 / scale)

  let idx = 0
  for (let x = 0; x <= width; x += spacing) {
    const isMajor = idx % 5 === 0
    ctx.strokeStyle = isMajor ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)'
    ctx.lineWidth = (isMajor ? 1.5 : 1) / scale
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
    if (isMajor && pxPerUnit && pxPerUnit > 0 && unit && x > 0) {
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(`${(x / pxPerUnit).toFixed(1)} ${unit}`, x + 2 / scale, 2 / scale)
    }
    idx++
  }

  idx = 0
  for (let y = 0; y <= height; y += spacing) {
    const isMajor = idx % 5 === 0
    ctx.strokeStyle = isMajor ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)'
    ctx.lineWidth = (isMajor ? 1.5 : 1) / scale
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
    if (isMajor && pxPerUnit && pxPerUnit > 0 && unit && y > 0) {
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(`${(y / pxPerUnit).toFixed(1)} ${unit}`, 2 / scale, y + 2 / scale)
    }
    idx++
  }
}
