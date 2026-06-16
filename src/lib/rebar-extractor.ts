// Rebar notation extractor — parses structural drawing text into rebar callouts
// Handles British (T/H/Y/R), metric Ø/φ, and spacing notations

export interface RebarCallout {
  raw: string         // original matched text
  count: number       // number of bars
  diameterMm: number  // bar diameter in mm
  spacingMm?: number  // if stirrup/distribution bar
  position?: string   // TOP, BOTTOM, EF, EW, NS, FS, etc.
  isStirrup: boolean
  nearText: string    // surrounding text for context
}

export interface DetectedElement {
  elementType: string
  elementMark: string
  floorLevel: string
  callouts: RebarCallout[]
  sourceLayer?: string
  sourcePage?: number
}

// ─── Regex patterns ──────────────────────────────────────────────────────────

// Matches: 6T16, 6H16, 6Y16, 6Ø16, 6φ16, 4R8, 6/T16, T16 (count optional)
const BAR_RE = /(\d+)?[\/\-]?[TtHhYyRrØøφΦ#](\d{1,2})(?:[\/\-](\d+))?(?:\s*(TOP|BOT(?:TOM)?|T|B|EF|EW|NS|FS|NEAR|FAR|FACE|SIDE|MAIN|DIST(?:RIBUTION)?|EXTRA|ADD(?:ITIONAL)?))?/gi

// Matches: T10@150, Ø10@150, R8@200, T12@150B1
const SPACING_RE = /[TtHhYyRrØøφΦ#](\d{1,2})\s*[@\-]\s*(\d{2,4})(?:\s*(EW|EF|B1|B2|T1|T2|NS|FS))?/gi

// Matches: 6T16+4T12 (compound bars)
const COMPOUND_RE = /(\d+)[TtHhYyRrØøφΦ#](\d{1,2})\s*\+\s*(\d+)[TtHhYyRrØøφΦ#](\d{1,2})/gi

// Layer → element type heuristics
const LAYER_ELEMENT_MAP: Array<{ re: RegExp; type: string }> = [
  { re: /BEAM|BM|^B[-_\d]/i,          type: 'beam'    },
  { re: /COL(?:UMN)?|^C[-_\d]/i,      type: 'column'  },
  { re: /SLAB|SL|FLOOR|ROOF|FL/i,     type: 'slab'    },
  { re: /FOOT(?:ING)?|FND|FOUND|^F[-_\d]/i, type: 'footing' },
  { re: /WALL|WL|^W[-_\d]/i,          type: 'wall'    },
  { re: /STAIR|STR|STP/i,             type: 'stair'   },
  { re: /PILE|PL/i,                   type: 'pile'    },
  { re: /RAFT|MAT/i,                  type: 'raft'    },
]

// Text → element mark heuristics
const MARK_PATTERNS = [
  /\b([BCFWbcfw]\d+(?:[AB]?)?)\b/,      // B1, C2, F3, W4
  /\b(COL[-\s]?\d+)\b/i,
  /\b(BEAM[-\s]?\d+[A-Z]?)\b/i,
  /\b(SLAB[-\s]?\d+[A-Z]?)\b/i,
  /\b(GL\d+)\b/i,                        // grid lines sometimes used as marks
]

// Floor level patterns
const LEVEL_PATTERNS = [
  /\b(GF|G\/F|GROUND)\b/i,
  /\b([1-9][0-9]?F|[1-9][0-9]?\s*FL(?:OOR)?)\b/i,
  /\b(ROOF|RF)\b/i,
  /\b(FOUND(?:ATION)?|FDN)\b/i,
  /\b(BASEMENT|BSMT|B[1-3])\b/i,
  /\b(LEVEL\s*[-\s]?\d+)\b/i,
  /\b(EL(?:EV)?\.?\s*[\+\-]?\d+\.?\d*)\b/i,
]

// ─── Parse a block of text for rebar callouts ────────────────────────────────
export function parseRebarText(text: string, nearText = ''): RebarCallout[] {
  const results: RebarCallout[] = []
  const combined = text + ' ' + nearText

  // 1. Spacing bars (stirrups / distribution)
  const spacingMatches = [...text.matchAll(SPACING_RE)]
  for (const m of spacingMatches) {
    const dia = parseInt(m[1], 10)
    const spacing = parseInt(m[2], 10)
    if (dia < 6 || dia > 50 || spacing < 50 || spacing > 1000) continue
    results.push({
      raw: m[0].trim(),
      count: 1,
      diameterMm: dia,
      spacingMm: spacing,
      position: m[3]?.toUpperCase(),
      isStirrup: dia <= 16,
      nearText: combined.slice(0, 100),
    })
  }

  // 2. Compound bars: 6T16+4T12
  const compoundMatches = [...text.matchAll(COMPOUND_RE)]
  for (const m of compoundMatches) {
    for (let i = 0; i < 2; i++) {
      const count = parseInt(m[1 + i * 2], 10)
      const dia = parseInt(m[2 + i * 2], 10)
      if (dia < 6 || dia > 50) continue
      results.push({ raw: m[0], count, diameterMm: dia, isStirrup: false, nearText: combined.slice(0, 100) })
    }
  }

  // 3. Standard bars
  const barMatches = [...text.matchAll(BAR_RE)]
  for (const m of barMatches) {
    // Skip if already matched as spacing
    if (m[3]) continue // has spacing suffix — already caught above
    const count = parseInt(m[1] ?? '1', 10)
    const dia = parseInt(m[2], 10)
    if (isNaN(dia) || dia < 6 || dia > 50) continue
    if (count < 1 || count > 200) continue
    const pos = m[4]?.toUpperCase()
    // Avoid duplicating spacing bar hits
    const isSpacing = results.some(r => r.diameterMm === dia && r.spacingMm !== undefined && Math.abs(r.raw.length - m[0].length) < 5)
    if (isSpacing) continue
    results.push({
      raw: m[0].trim(),
      count,
      diameterMm: dia,
      position: pos,
      isStirrup: (dia <= 12 && count <= 2) || pos?.startsWith('LINK') || false,
      nearText: combined.slice(0, 100),
    })
  }

  return results
}

// ─── Detect element type from layer name ─────────────────────────────────────
export function detectElementTypeFromLayer(layerName: string): string {
  for (const { re, type } of LAYER_ELEMENT_MAP) {
    if (re.test(layerName)) return type
  }
  return 'other'
}

// ─── Extract element mark from surrounding text ───────────────────────────────
export function extractMark(text: string): string {
  for (const re of MARK_PATTERNS) {
    const m = text.match(re)
    if (m) return m[1].toUpperCase().replace(/\s+/g, '')
  }
  return ''
}

export function extractFloorLevel(text: string): string {
  for (const re of LEVEL_PATTERNS) {
    const m = text.match(re)
    if (m) return m[1].toUpperCase()
  }
  return ''
}

// ─── Group text entities by proximity into "element zones" ───────────────────
export interface TextEntity {
  text: string
  x: number
  y: number
  layer: string
  page?: number
}

interface Zone {
  entities: TextEntity[]
  minX: number; maxX: number; minY: number; maxY: number
}

function overlaps(z: Zone, e: TextEntity, threshold: number): boolean {
  return (
    e.x >= z.minX - threshold && e.x <= z.maxX + threshold &&
    e.y >= z.minY - threshold && e.y <= z.maxY + threshold
  )
}

export function groupEntitiesIntoZones(entities: TextEntity[], threshold = 200): TextEntity[][] {
  const zones: Zone[] = []

  for (const e of entities) {
    const match = zones.find(z => overlaps(z, e, threshold))
    if (match) {
      match.entities.push(e)
      match.minX = Math.min(match.minX, e.x)
      match.maxX = Math.max(match.maxX, e.x)
      match.minY = Math.min(match.minY, e.y)
      match.maxY = Math.max(match.maxY, e.y)
    } else {
      zones.push({ entities: [e], minX: e.x, maxX: e.x, minY: e.y, maxY: e.y })
    }
  }

  return zones.map(z => z.entities)
}

// ─── Main extraction from DXF text entities ──────────────────────────────────
export function extractFromDXFEntities(
  entities: Array<{ type: string; text?: string; layer: string; start?: { x: number; y: number }; center?: { x: number; y: number } }>
): DetectedElement[] {
  // Collect text entities with positions
  const textEntities: TextEntity[] = []
  for (const e of entities) {
    if ((e.type === 'TEXT' || e.type === 'MTEXT' || e.type === 'DIMENSION') && e.text) {
      const pos = e.start ?? e.center ?? { x: 0, y: 0 }
      textEntities.push({ text: e.text, x: pos.x, y: pos.y, layer: e.layer })
    }
  }

  const zones = groupEntitiesIntoZones(textEntities)
  const elements: DetectedElement[] = []
  let autoIndex = 1

  for (const zone of zones) {
    const allText = zone.map(e => e.text).join(' ')
    const callouts = parseRebarText(allText)
    if (callouts.length === 0) continue

    const dominantLayer = zone[0]?.layer ?? '0'
    const elementType = detectElementTypeFromLayer(dominantLayer) !== 'other'
      ? detectElementTypeFromLayer(dominantLayer)
      : guessElementTypeFromText(allText)

    const mark = extractMark(allText) || `${elementType.charAt(0).toUpperCase()}${autoIndex++}`
    const floorLevel = extractFloorLevel(allText)

    elements.push({
      elementType,
      elementMark: mark,
      floorLevel,
      callouts,
      sourceLayer: dominantLayer,
    })
  }

  return mergeByMark(elements)
}

// ─── Extraction from raw text (PDF pages) ────────────────────────────────────
export function extractFromPageText(pageTexts: Array<{ text: string; page: number }>): DetectedElement[] {
  const elements: DetectedElement[] = []
  let autoIndex = 1

  for (const { text, page } of pageTexts) {
    // Split into lines and scan for element headers
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    let currentElement: DetectedElement | null = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const context = lines.slice(Math.max(0, i - 2), i + 3).join(' ')

      // Check if line defines a new element
      const elementType = guessElementTypeFromText(line)
      const mark = extractMark(line)
      if (elementType !== 'other' && mark) {
        if (currentElement && currentElement.callouts.length > 0) {
          elements.push(currentElement)
        }
        currentElement = {
          elementType,
          elementMark: mark,
          floorLevel: extractFloorLevel(context),
          callouts: [],
          sourcePage: page,
        }
        continue
      }

      // Parse rebar callouts from this line
      const callouts = parseRebarText(line, context)
      if (callouts.length > 0) {
        if (!currentElement) {
          currentElement = {
            elementType: elementType !== 'other' ? elementType : 'beam',
            elementMark: mark || `E${autoIndex++}`,
            floorLevel: extractFloorLevel(context),
            callouts: [],
            sourcePage: page,
          }
        }
        currentElement.callouts.push(...callouts)
      }
    }

    if (currentElement && currentElement.callouts.length > 0) {
      elements.push(currentElement)
    }
  }

  return mergeByMark(elements)
}

function guessElementTypeFromText(text: string): string {
  const t = text.toUpperCase()
  if (/BEAM|BM /.test(t)) return 'beam'
  if (/COL(?:UMN)?/.test(t)) return 'column'
  if (/SLAB|FLOOR|ROOF/.test(t)) return 'slab'
  if (/FOOT(?:ING)?|FND|FOUNDATION/.test(t)) return 'footing'
  if (/WALL/.test(t)) return 'wall'
  if (/STAIR|STEP/.test(t)) return 'stair'
  if (/PILE/.test(t)) return 'pile'
  if (/RAFT|MAT/.test(t)) return 'raft'
  return 'other'
}

function mergeByMark(elements: DetectedElement[]): DetectedElement[] {
  const map = new Map<string, DetectedElement>()
  for (const el of elements) {
    const key = `${el.elementType}:${el.elementMark}`
    const existing = map.get(key)
    if (existing) {
      existing.callouts.push(...el.callouts)
    } else {
      map.set(key, { ...el })
    }
  }
  return Array.from(map.values())
}

// ─── Convert callout → BBS bar row ──────────────────────────────────────────
export interface BBSBarDraft {
  bar_mark: string
  diameter_mm: number
  shape_code: string
  bending_dims: Record<string, number>
  quantity: number
  notes: string
}

export function calloutToBarDraft(callout: RebarCallout, index: number): BBSBarDraft {
  const mark = String.fromCharCode(65 + (index % 26)) // A, B, C, ...

  let shapeCode = '00' // straight
  const notes = callout.raw

  if (callout.isStirrup || callout.spacingMm) {
    shapeCode = '51' // closed stirrup
  } else if (callout.position?.startsWith('B') && callout.position !== 'BOT') {
    shapeCode = '11' // L-bar (bottom with hook)
  }

  const qty = callout.spacingMm
    ? callout.count  // distribution bars — qty from drawing or 1
    : callout.count

  return {
    bar_mark: mark,
    diameter_mm: callout.diameterMm,
    shape_code: shapeCode,
    bending_dims: { A: 0 }, // to be filled by engineer
    quantity: qty,
    notes: notes + (callout.position ? ` [${callout.position}]` : '') + (callout.spacingMm ? ` @${callout.spacingMm}` : ''),
  }
}
