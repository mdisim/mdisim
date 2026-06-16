// Rebar calculation engine — BS 8666 / IS 451 conventions
// All lengths in mm, weights in kg

export const REBAR_DIAMETERS = [6, 8, 10, 12, 16, 20, 25, 32, 40] as const
export type RebarDiameter = (typeof REBAR_DIAMETERS)[number]

// Unit weight kg/m  = π/4 × d² × 7850 / 1e6
export const UNIT_WEIGHT: Record<RebarDiameter, number> = {
  6:  0.222,
  8:  0.395,
  10: 0.617,
  12: 0.888,
  16: 1.578,
  20: 2.466,
  25: 3.854,
  32: 6.313,
  40: 9.864,
}

// Standard hook allowances (mm) — 180° hook = 4d + bend radius; 90° = 2d
export function hookAllowance(diameterMm: number, hookType: '180' | '90' | 'none' = 'none'): number {
  if (hookType === 'none') return 0
  if (hookType === '180') return Math.round(4 * diameterMm + 3 * diameterMm) // 7d approx
  return Math.round(3 * diameterMm) // 90° = 3d
}

// Lap length = multiplier × diameter (default 40d for tension lap, class B)
export function lapLength(diameterMm: number, lapMultiplier = 40): number {
  return lapMultiplier * diameterMm
}

// Development/anchorage length (straight bar, fck 25 MPa, fy 500 MPa → ~40d)
export function devLength(diameterMm: number, multiplier = 40): number {
  return multiplier * diameterMm
}

// ─── Shape code bending dimension keys ─────────────────────────────────────
// BS 8666 shapes: 00 = straight, 11 = L-bar, 21 = U-bar, 31 = Z-bar,
// 41 = U-stirrup, 51 = closed stirrup, 60 = spiral, 99 = custom
export type ShapeCode = '00' | '11' | '21' | '31' | '41' | '51' | '60' | '99'

export interface BendingDims {
  A?: number  // total/main length
  B?: number
  C?: number
  D?: number
  E?: number
  R?: number  // bend radius
  angle?: number
}

// Calculate cut length from shape code + bending dims + diameter
export function calcCutLength(
  shapeCode: ShapeCode,
  dims: BendingDims,
  diameterMm: number
): number {
  const d = diameterMm
  const { A = 0, B = 0, C = 0, D = 0, E = 0 } = dims

  // Deduction per 90° bend ≈ 2d (simplified, per BS 8666 Table 2)
  const bend90 = 2 * d

  switch (shapeCode) {
    case '00': // straight
      return A
    case '11': // L-bar (one 90° bend)
      return A + B - bend90
    case '21': // U-bar (two 90° bends)
      return A + 2 * B - 2 * bend90
    case '31': // Z-bar (two 90° bends, offset)
      return A + B + C - 2 * bend90
    case '41': // Open U-stirrup (three 90° bends)
      return A + 2 * B + C - 3 * bend90
    case '51': // Closed stirrup (four 90° bends + hooks)
      return 2 * (A + B) + hookAllowance(d, '90') * 2 - 4 * bend90
    case '60': // Spiral — A=pitch, B=diameter_of_coil, C=number_of_turns
      return Math.round(Math.PI * B * C + A * C) // approx
    case '99': // custom — user provides total cut length directly in A
      return A
    default:
      return A + B + C + D + E
  }
}

export function calcBarWeight(cutLengthMm: number, diameterMm: number): number {
  const d = diameterMm as RebarDiameter
  const weight = UNIT_WEIGHT[d] ?? (Math.PI / 4) * (d / 1000) ** 2 * 7850
  return (cutLengthMm / 1000) * weight
}

// ─── Stirrup perimeter helper ───────────────────────────────────────────────
// Given section width (bw) and depth (h), cover (c), bar spacing details
// Returns the leg-dimensions for shape code 51
export function stirrupDims(
  bw: number,  // section width mm
  h: number,   // section depth mm
  cover: number = 40
): { A: number; B: number } {
  return {
    A: bw - 2 * cover,
    B: h  - 2 * cover,
  }
}

// ─── DXF layer-name heuristics ──────────────────────────────────────────────
// Returns element hints found in layer names
export interface DXFElementHint {
  layerName: string
  elementType: string
  mark: string
}

const LAYER_PATTERNS: Array<{ re: RegExp; type: string }> = [
  { re: /\bB[-_]?\d+\b/i,   type: 'beam'    },
  { re: /\bCOL[-_]?\d+\b/i, type: 'column'  },
  { re: /\bC[-_]?\d+\b/i,   type: 'column'  },
  { re: /\bSL[-_]?\d+\b/i,  type: 'slab'    },
  { re: /\bF[-_]?\d+\b/i,   type: 'footing' },
  { re: /\bW[-_]?\d+\b/i,   type: 'wall'    },
  { re: /\bPL[-_]?\d+\b/i,  type: 'pile'    },
  { re: /BEAM/i,             type: 'beam'    },
  { re: /COLUMN/i,           type: 'column'  },
  { re: /SLAB/i,             type: 'slab'    },
  { re: /FOOTING/i,          type: 'footing' },
  { re: /WALL/i,             type: 'wall'    },
  { re: /STAIR/i,            type: 'stair'   },
  { re: /RAFT/i,             type: 'raft'    },
]

export function detectElementsFromLayers(layerNames: string[]): DXFElementHint[] {
  const results: DXFElementHint[] = []
  const seen = new Set<string>()

  for (const name of layerNames) {
    for (const { re, type } of LAYER_PATTERNS) {
      const match = name.match(re)
      if (match) {
        const key = `${type}:${match[0].toUpperCase()}`
        if (!seen.has(key)) {
          seen.add(key)
          results.push({ layerName: name, elementType: type, mark: match[0].toUpperCase() })
        }
        break
      }
    }
  }
  return results
}

// ─── Bar schedule summary ────────────────────────────────────────────────────
export interface DiameterSummary {
  diameterMm: number
  totalBars: number
  totalLengthMm: number
  totalWeightKg: number
}

export function summarizeByDiameter(
  bars: Array<{ diameter_mm: number; quantity: number; cut_length_mm: number | null; total_weight_kg: number | null }>
): DiameterSummary[] {
  const map = new Map<number, DiameterSummary>()
  for (const bar of bars) {
    const existing = map.get(bar.diameter_mm) ?? {
      diameterMm: bar.diameter_mm,
      totalBars: 0,
      totalLengthMm: 0,
      totalWeightKg: 0,
    }
    existing.totalBars += bar.quantity
    existing.totalLengthMm += (bar.cut_length_mm ?? 0) * bar.quantity
    existing.totalWeightKg += bar.total_weight_kg ?? 0
    map.set(bar.diameter_mm, existing)
  }
  return Array.from(map.values()).sort((a, b) => a.diameterMm - b.diameterMm)
}
