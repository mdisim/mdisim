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
