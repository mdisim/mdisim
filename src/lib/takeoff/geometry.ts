export interface Point {
  x: number
  y: number
}

export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function polylineLength(points: Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1], points[i])
  }
  return total
}

/** Shoelace formula for polygon area (absolute value) */
export function polygonArea(points: Point[]): number {
  const n = points.length
  if (n < 3) return 0
  let area = 0
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return Math.abs(area) / 2
}

export function rectangleArea(origin: Point, width: number, height: number): number {
  return Math.abs(width * height)
}

export function circleArea(radius: number): number {
  return Math.PI * radius * radius
}

/** Convert pixel distance to real-world units */
export function pixelsToReal(pixels: number, pxPerUnit: number): number {
  if (pxPerUnit <= 0) return pixels
  return pixels / pxPerUnit
}

/** Convert square pixel area to real-world area (divide by pxPerUnit²) */
export function sqPixelsToReal(sqPixels: number, pxPerUnit: number): number {
  if (pxPerUnit <= 0) return sqPixels
  return sqPixels / (pxPerUnit * pxPerUnit)
}

/** A snap candidate returned by the snapping engine */
export interface SnapTarget {
  point: Point
  type: 'endpoint' | 'midpoint' | 'intersection' | 'perpendicular' | 'nearest' | 'grid'
  sourceId?: string
}

/** Configuration for which snap modes are active */
export interface SnapConfig {
  enabled: boolean
  endpoint: boolean
  midpoint: boolean
  intersection: boolean
  perpendicular: boolean
  nearest: boolean
  grid: boolean
  gridSize: number
  snapRadius: number
}

/** Geometry data for a single measurement used in snap calculations */
export interface SnapGeometry {
  id: string
  points: Point[]
  type: 'line' | 'polyline' | 'area' | 'rectangle' | 'circle' | 'count'
}

export const DEFAULT_SNAP_CONFIG: SnapConfig = {
  enabled: true,
  endpoint: true,
  midpoint: true,
  intersection: false,
  perpendicular: false,
  nearest: true,
  grid: false,
  gridSize: 50,
  snapRadius: 15,
}

export function nearestPointOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return { x: a.x, y: a.y }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return { x: a.x + t * dx, y: a.y + t * dy }
}

export function segmentMidpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function angleBetween(a: Point, vertex: Point, b: Point): number {
  const v1x = a.x - vertex.x
  const v1y = a.y - vertex.y
  const v2x = b.x - vertex.x
  const v2y = b.y - vertex.y
  const dot = v1x * v2x + v1y * v2y
  const cross = v1x * v2y - v1y * v2x
  const radians = Math.atan2(Math.abs(cross), dot)
  return radians * (180 / Math.PI)
}

export function constrainAngle(origin: Point, cursor: Point, angleStep: number): Point {
  const dx = cursor.x - origin.x
  const dy = cursor.y - origin.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return { x: origin.x, y: origin.y }
  const rawAngle = Math.atan2(dy, dx)
  const stepRad = (angleStep * Math.PI) / 180
  const snappedAngle = Math.round(rawAngle / stepRad) * stepRad
  return {
    x: origin.x + len * Math.cos(snappedAngle),
    y: origin.y + len * Math.sin(snappedAngle),
  }
}

export function perimeterLength(points: Point[]): number {
  if (points.length < 2) return 0
  let total = polylineLength(points)
  total += distance(points[points.length - 1], points[0])
  return total
}

export function extractSegments(measurements: SnapGeometry[]): Array<{ a: Point; b: Point; id: string }> {
  const segments: Array<{ a: Point; b: Point; id: string }> = []
  for (const m of measurements) {
    if (m.points.length < 2) continue
    if (m.type === 'area') {
      for (let i = 0; i < m.points.length; i++) {
        const j = (i + 1) % m.points.length
        segments.push({ a: m.points[i], b: m.points[j], id: m.id })
      }
    } else {
      for (let i = 1; i < m.points.length; i++) {
        segments.push({ a: m.points[i - 1], b: m.points[i], id: m.id })
      }
    }
  }
  return segments
}

export function findSnapTarget(
  cursor: Point,
  existingMeasurements: SnapGeometry[],
  config: SnapConfig,
  activePoints?: Point[]
): SnapTarget | null {
  if (!config.enabled) return null

  const r = config.snapRadius
  let best: SnapTarget | null = null
  let bestDist = r

  if (config.endpoint) {
    for (const m of existingMeasurements) {
      for (const pt of m.points) {
        const d = distance(cursor, pt)
        if (d < bestDist) {
          bestDist = d
          best = { point: pt, type: 'endpoint', sourceId: m.id }
        }
      }
    }
    if (activePoints) {
      for (const pt of activePoints) {
        const d = distance(cursor, pt)
        if (d < bestDist) {
          bestDist = d
          best = { point: pt, type: 'endpoint' }
        }
      }
    }
    if (best) return best
  }

  if (config.midpoint) {
    const segs = extractSegments(existingMeasurements)
    for (const seg of segs) {
      const mid = segmentMidpoint(seg.a, seg.b)
      const d = distance(cursor, mid)
      if (d < bestDist) {
        bestDist = d
        best = { point: mid, type: 'midpoint', sourceId: seg.id }
      }
    }
    if (best) return best
  }

  if (config.nearest) {
    const segs = extractSegments(existingMeasurements)
    for (const seg of segs) {
      const np = nearestPointOnSegment(cursor, seg.a, seg.b)
      const d = distance(cursor, np)
      if (d < bestDist) {
        bestDist = d
        best = { point: np, type: 'nearest', sourceId: seg.id }
      }
    }
    if (best) return best
  }

  if (config.grid) {
    const gs = config.gridSize
    const snapped: Point = {
      x: Math.round(cursor.x / gs) * gs,
      y: Math.round(cursor.y / gs) * gs,
    }
    if (distance(cursor, snapped) < bestDist) {
      return { point: snapped, type: 'grid' }
    }
  }

  return null
}

export function formatDimension(value: number, unit: string | null, pxPerUnit: number): string {
  if (!unit || pxPerUnit <= 0) {
    return `${Math.round(value)} px`
  }
  if (unit.includes('²')) {
    const realValue = value / (pxPerUnit * pxPerUnit)
    return `${realValue.toFixed(2)} ${unit}`
  }
  const realValue = value / pxPerUnit
  return `${realValue.toFixed(2)} ${unit}`
}
