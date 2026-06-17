// Rebar notation extractor — parses structural drawing text into rebar callouts
//
// Supported notations (all diameter symbols: Ø ø φ Φ T H Y R #):
//   2Ø12              count + dia
//   4Ø12@200          count + dia + spacing
//   2X3Ø12            rows × count + dia  (total = 2×3 = 6)
//   2X3Ø12 L=929      rows × count + dia + explicit cut length
//   Ø12@200           dia + spacing (no count)
//   Ø12@200 L=116     dia + spacing + cut length
//   6T16 TOP          British notation with position keyword
//   T12-200           dash spacing
//   6T16+4T12         compound bars
//   4T12@200 B1       count + dia + spacing + element context

// ─── Valid diameters for filtering false positives ──────────────────────────
const VALID_DIAMETERS = new Set([6, 8, 10, 12, 14, 16, 20, 25, 32, 40])

// ─── Diameter symbol class (covers Ø ø Ö ö φ Φ and letters T H Y R) ─────────
const DIA_SYM = '[TtHhYyRrØøÖöφΦØøφΦ#]'

// ─── Master rebar pattern ─────────────────────────────────────────────────────
// Groups:
//  1: rows (nX prefix)    e.g. "2" from "2X3Ø12"
//  2: count               e.g. "3" from "2X3Ø12", or "4" from "4Ø12"
//  3: diameter            e.g. "12"
//  4: spacing             e.g. "200" from "@200" or "-200"
//  5: cut length          e.g. "929" from "L=929"
//  6: position keyword    e.g. "TOP"
const REBAR_RE = new RegExp(
  // optional rows × count prefix:  "2X3" | "2x3"
  `(?:(\\d+)[Xx])?` +
  // count (optional when dia-only notation):
  `(\\d+)?` +
  // diameter symbol + digits:
  `${DIA_SYM}(\\d{1,2})` +
  // optional spacing:  @200  -200  -20
  `(?:\\s*[@\\-]\\s*(\\d{2,4}))?` +
  // optional cut length:  L=929  l=116  L =929
  `(?:\\s+[Ll]\\s*=\\s*(\\d+))?` +
  // optional position keyword:
  `(?:\\s+(TOP|BOT(?:TOM)?|T(?=\\s)|B(?=\\s)|EF|EW|NS|FS|NEAR|FAR|FACE|MAIN|DIST|ADD|LINK|STIR(?:RUP)?|LEG|HANGER))?`,
  'g'
)

// Compound: 6T16+4T12
const COMPOUND_RE = new RegExp(
  `(\\d+)${DIA_SYM}(\\d{1,2})\\s*\\+\\s*(\\d+)${DIA_SYM}(\\d{1,2})`,
  'g'
)

export interface RebarCallout {
  raw: string
  count: number           // total bar count (rows × n)
  diameterMm: number
  spacingMm?: number      // centre-to-centre spacing
  cutLengthMm?: number    // explicit L= value from drawing
  position?: string       // TOP, BOTTOM, EF, EW, …
  isStirrup: boolean
  nearText: string
}

export interface DetectedElement {
  elementType: string
  elementMark: string
  floorLevel: string
  callouts: RebarCallout[]
  sourceLayer?: string
  sourcePage?: number
}

// ─── Spacing inference: drawings often write spacing in cm, not mm ─────────────
function normaliseSpacing(raw: number): number {
  return raw < 50 ? raw * 10 : raw
}

// ─── Parse a block of text ───────────────────────────────────────────────────
export function parseRebarText(text: string, nearText = ''): RebarCallout[] {
  const results: RebarCallout[] = []
  const combined = (text + ' ' + nearText).slice(0, 200)
  const seen = new Set<string>()

  // 1. Compound bars first to avoid double-counting
  for (const m of text.matchAll(COMPOUND_RE)) {
    for (let i = 0; i < 2; i++) {
      const count = parseInt(m[1 + i * 2], 10)
      const dia   = parseInt(m[2 + i * 2], 10)
      if (!VALID_DIAMETERS.has(dia)) continue
      if (count < 1 || count > 200) continue
      const key = `${count}:${dia}:compound`
      if (seen.has(key)) continue
      seen.add(key)
      results.push({ raw: m[0].trim(), count, diameterMm: dia, isStirrup: false, nearText: combined })
    }
  }

  // 2. Master pattern
  for (const m of text.matchAll(REBAR_RE)) {
    const rawMatch = m[0].trim()
    if (!rawMatch) continue

    const rows    = m[1] ? parseInt(m[1], 10) : 1
    const n       = m[2] ? parseInt(m[2], 10) : 1
    const dia     = parseInt(m[3], 10)
    const rawSpc  = m[4] ? parseInt(m[4], 10) : undefined
    const cutLen  = m[5] ? parseInt(m[5], 10) : undefined
    const pos     = m[6]?.toUpperCase()

    // Strict diameter validation — reject non-standard diameters
    if (!VALID_DIAMETERS.has(dia)) continue
    if (n < 1 || n > 200) continue
    if (rows < 1 || rows > 20) continue

    const totalCount = rows * n
    const spacingMm  = rawSpc !== undefined ? normaliseSpacing(rawSpc) : undefined

    // Deduplicate: use count+dia+spacing as key to catch "4Ø12" and "4T12"
    const dedupeKey = `${totalCount}:${dia}:${spacingMm ?? 'none'}:${cutLen ?? 'none'}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    // Skip if spacing is implausible
    if (spacingMm !== undefined && (spacingMm < 50 || spacingMm > 2000)) continue

    // Skip if cut length is implausible (< 100mm or > 20000mm)
    if (cutLen !== undefined && (cutLen < 100 || cutLen > 20000)) continue

    const isStirrup =
      pos === 'LINK' || pos?.includes('STIR') || pos === 'LEG' || pos === 'HANGER' ||
      (spacingMm !== undefined && dia <= 16 && totalCount <= 1)

    results.push({
      raw: rawMatch,
      count: totalCount,
      diameterMm: dia,
      spacingMm,
      cutLengthMm: cutLen,
      position: pos,
      isStirrup,
      nearText: combined,
    })
  }

  return results
}

// ─── Layer → element type ────────────────────────────────────────────────────
const LAYER_ELEMENT_MAP: Array<{ re: RegExp; type: string }> = [
  { re: /BEAM|BM|^B[-_\d]/i,                    type: 'beam'    },
  { re: /COL(?:UMN)?|^C[-_\d]/i,                type: 'column'  },
  { re: /SLAB|SL|FLOOR|ROOF|FL/i,               type: 'slab'    },
  { re: /FOOT(?:ING)?|FND|FOUND|^F[-_\d]/i,     type: 'footing' },
  { re: /WALL|WL|^W[-_\d]/i,                    type: 'wall'    },
  { re: /STAIR|STR|STP/i,                       type: 'stair'   },
  { re: /PILE|PL/i,                             type: 'pile'    },
  { re: /RAFT|MAT/i,                            type: 'raft'    },
]

export function detectElementTypeFromLayer(layerName: string): string {
  for (const { re, type } of LAYER_ELEMENT_MAP) {
    if (re.test(layerName)) return type
  }
  return 'other'
}

// ─── Mark / level extraction ──────────────────────────────────────────────────
const MARK_PATTERNS = [
  /\b([BCFWbcfw]\d+(?:[AB]?)?)\b/,
  /\b(COL[-\s]?\d+)\b/i,
  /\b(BEAM[-\s]?\d+[A-Z]?)\b/i,
  /\b(SLAB[-\s]?\d+[A-Z]?)\b/i,
  /\b(GL\d+)\b/i,
  /\b([KLMNOPQ]\d*)\b/,
  /\b(ST\d+)\b/i,
  /\b(PL\d+)\b/i,
  /\b(RF\d+)\b/i,
]

const LEVEL_PATTERNS = [
  /\b(GF|G\/F|GROUND)\b/i,
  /\b([1-9][0-9]?F|[1-9][0-9]?\s*FL(?:OOR)?)\b/i,
  /\b(ROOF|RF)\b/i,
  /\b(FOUND(?:ATION)?|FDN)\b/i,
  /\b(BASEMENT|BSMT|B[1-3])\b/i,
  /\b(LEVEL\s*[-\s]?\d+)\b/i,
  /\b(EL(?:EV)?\.?\s*[\+\-]?\d+\.?\d*)\b/i,
]

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

// ─── Text entity spatial clustering for DXF ──────────────────────────────────
export interface TextEntity {
  text: string; x: number; y: number; layer: string; page?: number
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

// ─── DXF extraction ───────────────────────────────────────────────────────────
export function extractFromDXFEntities(
  entities: Array<{ type: string; text?: string; layer: string; start?: { x: number; y: number }; center?: { x: number; y: number } }>
): DetectedElement[] {
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

    elements.push({
      elementType,
      elementMark: mark,
      floorLevel: extractFloorLevel(allText),
      callouts,
      sourceLayer: dominantLayer,
    })
  }

  return mergeByMark(elements)
}

// ─── PDF page-text extraction ─────────────────────────────────────────────────
export function extractFromPageText(pageTexts: Array<{ text: string; page: number }>): DetectedElement[] {
  const elements: DetectedElement[] = []
  let autoIndex = 1

  for (const { text, page } of pageTexts) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    let currentElement: DetectedElement | null = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const context = lines.slice(Math.max(0, i - 2), i + 3).join(' ')

      const elementType = guessElementTypeFromText(line)
      const mark = extractMark(line)
      if (elementType !== 'other' && mark) {
        if (currentElement && currentElement.callouts.length > 0) elements.push(currentElement)
        currentElement = {
          elementType, elementMark: mark,
          floorLevel: extractFloorLevel(context), callouts: [], sourcePage: page,
        }
        continue
      }

      const callouts = parseRebarText(line, context)
      if (callouts.length > 0) {
        if (!currentElement) {
          currentElement = {
            elementType: elementType !== 'other' ? elementType : 'other',
            elementMark: mark || `E${autoIndex++}`,
            floorLevel: extractFloorLevel(context), callouts: [], sourcePage: page,
          }
        }
        currentElement.callouts.push(...callouts)
      }
    }

    if (currentElement && currentElement.callouts.length > 0) elements.push(currentElement)
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
      // Deduplicate callouts within merged element
      for (const c of el.callouts) {
        const isDupe = existing.callouts.some(ec =>
          ec.diameterMm === c.diameterMm &&
          ec.count === c.count &&
          ec.spacingMm === c.spacingMm &&
          ec.cutLengthMm === c.cutLengthMm
        )
        if (!isDupe) existing.callouts.push(c)
      }
    } else {
      map.set(key, { ...el, callouts: [...el.callouts] })
    }
  }
  return Array.from(map.values())
}

// ─── Callout → BBS bar draft ──────────────────────────────────────────────────
export interface BBSBarDraft {
  bar_mark: string
  diameter_mm: number
  shape_code: string
  bending_dims: Record<string, number>
  quantity: number
  notes: string
}

export function calloutToBarDraft(callout: RebarCallout, index: number): BBSBarDraft {
  const mark = String.fromCharCode(65 + (index % 26))

  let shapeCode = '00' // straight bar
  if (callout.isStirrup || callout.position === 'LINK' || callout.position?.includes('STIR')) {
    shapeCode = '51' // links/stirrups
  } else if (callout.position === 'LEG' || callout.position === 'HANGER') {
    shapeCode = '21' // L-shape
  } else if (callout.position?.startsWith('BOT') || callout.position === 'B') {
    shapeCode = '11' // cranked bar
  }

  const dims: Record<string, number> = {}
  if (callout.cutLengthMm) {
    dims.A = callout.cutLengthMm
  }

  const noteParts = [callout.raw]
  if (callout.position) noteParts.push(`[${callout.position}]`)
  if (callout.spacingMm) noteParts.push(`@${callout.spacingMm}mm c/c`)

  return {
    bar_mark: mark,
    diameter_mm: callout.diameterMm,
    shape_code: shapeCode,
    bending_dims: dims,
    quantity: callout.count,
    notes: noteParts.join(' '),
  }
}
