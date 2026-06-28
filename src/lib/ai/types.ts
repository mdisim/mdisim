export interface AIDetectedElement {
  id: string
  type: ElementType
  label: string
  description: string
  dimensions?: ElementDimensions
  material?: string
  suggestedUnit: string
  estimatedQuantity: number | null
  confidence: number
  boundingBox?: BoundingBox
  boqDescription: string
  boqUnit: string
  boqCode?: string
  trade: Trade
  reasoning: string
  isRepeated?: boolean
  repeatCount?: number
}

export type ElementType =
  | 'wall' | 'slab' | 'beam' | 'column' | 'door' | 'window'
  | 'stair' | 'pipe' | 'duct' | 'road' | 'curb' | 'footing'
  | 'rebar' | 'block' | 'finish' | 'other'

export type Trade =
  | 'concrete' | 'masonry' | 'steel' | 'carpentry' | 'plumbing'
  | 'electrical' | 'mechanical' | 'finishing' | 'earthwork' | 'roads'
  | 'landscaping' | 'general'

export interface ElementDimensions {
  length?: number
  width?: number
  height?: number
  thickness?: number
  diameter?: number
  unit: string
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface DetectedDimension {
  value: number
  unit: string
  location: BoundingBox
  associatedElementId?: string
  confidence: number
}

export interface DetectedScale {
  ratio: string
  pixelsPerUnit: number
  unit: string
  confidence: number
  reasoning: string
}

export interface AIDrawingAnalysis {
  drawingType: string
  summary: string
  elements: AIDetectedElement[]
  dimensions: DetectedDimension[]
  detectedScale: DetectedScale | null
  repeatedPatterns: RepeatedPattern[]
}

export interface RepeatedPattern {
  elementType: ElementType
  count: number
  description: string
  representativeElementId: string
}

export interface AIBOQGroup {
  trade: Trade
  tradeLabel: string
  items: AIBOQItem[]
  subtotal: number | null
}

export interface AIBOQItem {
  code: string
  description: string
  unit: string
  quantity: number
  unitRate: number | null
  amount: number | null
  confidence: number
  reasoning: string
  sourceElementIds: string[]
  materialBreakdown?: MaterialBreakdown
}

export interface MaterialBreakdown {
  concrete?: { volume: number; grade: string }
  steel?: { weight: number; type: string }
  blocks?: { count: number; size: string }
  finishingArea?: { area: number; type: string }
}

export interface AIFullAnalysis {
  drawing: AIDrawingAnalysis
  boq: AIBOQGroup[]
  totalEstimatedCost: number | null
  currency: string
  error?: string
}

export interface UserCorrection {
  elementId: string
  field: string
  originalValue: unknown
  correctedValue: unknown
  timestamp: string
}

export interface AICostEstimate {
  boqItemCode: string
  suggestedUnitRate: number
  currency: string
  confidence: number
  source: string
  reasoning: string
}
