export type TakeoffToolType =
  | 'length'
  | 'area'
  | 'rectangle'
  | 'circle'
  | 'volume'
  | 'concrete'
  | 'rebar'
  | 'blockwork'
  | 'plaster'
  | 'paint'
  | 'flooring'
  | 'tiles'
  | 'excavation'
  | 'backfill'
  | 'asphalt'
  | 'count'
  | 'calibrate'

export interface ToolConfig {
  type: TakeoffToolType
  label: string
  icon: string // lucide icon name
  color: string // hex
  drawMode: 'line' | 'polygon' | 'rectangle' | 'circle' | 'point' | 'none'
  unit: string
  description: string
  materialInputs?: MaterialInput[]
}

export interface MaterialInput {
  key: string
  label: string
  type: 'number' | 'select'
  defaultValue: number | string
  options?: { value: string; label: string }[]
  unit?: string
}

export const TAKEOFF_TOOLS: ToolConfig[] = [
  {
    type: 'calibrate',
    label: 'Calibrate Scale',
    icon: 'Ruler',
    color: '#8b5cf6',
    drawMode: 'line',
    unit: 'm',
    description: 'Draw a known dimension to set the scale',
  },
  {
    type: 'length',
    label: 'Length',
    icon: 'Minus',
    color: '#f59e0b',
    drawMode: 'line',
    unit: 'm',
    description: 'Measure linear distance',
  },
  {
    type: 'area',
    label: 'Area',
    icon: 'Square',
    color: '#3b82f6',
    drawMode: 'polygon',
    unit: 'm²',
    description: 'Measure floor area or surface',
  },
  {
    type: 'rectangle',
    label: 'Rectangle',
    icon: 'RectangleHorizontal',
    color: '#10b981',
    drawMode: 'rectangle',
    unit: 'm²',
    description: 'Click two opposite corners to measure rectangular area',
  },
  {
    type: 'circle',
    label: 'Circle',
    icon: 'CircleDot',
    color: '#06b6d4',
    drawMode: 'circle',
    unit: 'm²',
    description: 'Click centre then edge point to measure circular area',
  },
  {
    type: 'volume',
    label: 'Volume',
    icon: 'Box',
    color: '#10b981',
    drawMode: 'polygon',
    unit: 'm³',
    description: 'Area × depth',
    materialInputs: [
      { key: 'depth', label: 'Depth', type: 'number', defaultValue: 0.2, unit: 'm' },
    ],
  },
  {
    type: 'concrete',
    label: 'Concrete',
    icon: 'Layers',
    color: '#6b7280',
    drawMode: 'polygon',
    unit: 'm³',
    description: 'Concrete volume with grade/cover',
    materialInputs: [
      { key: 'thickness', label: 'Thickness', type: 'number', defaultValue: 0.2, unit: 'm' },
      {
        key: 'grade',
        label: 'Grade',
        type: 'select',
        defaultValue: 'C25/30',
        options: [
          { value: 'C16/20', label: 'C16/20' },
          { value: 'C20/25', label: 'C20/25' },
          { value: 'C25/30', label: 'C25/30' },
          { value: 'C30/37', label: 'C30/37' },
          { value: 'C35/45', label: 'C35/45' },
        ],
      },
    ],
  },
  {
    type: 'rebar',
    label: 'Reinforcement',
    icon: 'GitBranch',
    color: '#dc2626',
    drawMode: 'polygon',
    unit: 'kg',
    description: 'Reinforcement steel by area and spec',
    materialInputs: [
      {
        key: 'diameter',
        label: 'Bar Diameter',
        type: 'select',
        defaultValue: '12',
        options: [
          { value: '8', label: 'Ø8mm' },
          { value: '10', label: 'Ø10mm' },
          { value: '12', label: 'Ø12mm' },
          { value: '16', label: 'Ø16mm' },
          { value: '20', label: 'Ø20mm' },
          { value: '25', label: 'Ø25mm' },
          { value: '32', label: 'Ø32mm' },
        ],
      },
      { key: 'spacing', label: 'Spacing', type: 'number', defaultValue: 200, unit: 'mm' },
      { key: 'layers', label: 'Layers', type: 'number', defaultValue: 2 },
    ],
  },
  {
    type: 'blockwork',
    label: 'Blockwork',
    icon: 'Grid3x3',
    color: '#d97706',
    drawMode: 'polygon',
    unit: 'm²',
    description: 'Wall area for block count',
    materialInputs: [
      {
        key: 'blockSize',
        label: 'Block Size',
        type: 'select',
        defaultValue: '200x400',
        options: [
          { value: '100x400', label: '100×400mm' },
          { value: '150x400', label: '150×400mm' },
          { value: '200x400', label: '200×400mm' },
          { value: '250x400', label: '250×400mm' },
        ],
      },
    ],
  },
  {
    type: 'plaster',
    label: 'Plaster',
    icon: 'PaintRoller',
    color: '#f9a8d4',
    drawMode: 'polygon',
    unit: 'm²',
    description: 'Plaster area with coats',
    materialInputs: [
      { key: 'thickness', label: 'Thickness', type: 'number', defaultValue: 15, unit: 'mm' },
      { key: 'coats', label: 'Coats', type: 'number', defaultValue: 2 },
    ],
  },
  {
    type: 'paint',
    label: 'Paint',
    icon: 'Paintbrush',
    color: '#a78bfa',
    drawMode: 'polygon',
    unit: 'm²',
    description: 'Painted surface area',
    materialInputs: [
      { key: 'coats', label: 'Coats', type: 'number', defaultValue: 2 },
      { key: 'coverage', label: 'Coverage', type: 'number', defaultValue: 10, unit: 'm²/L' },
    ],
  },
  {
    type: 'flooring',
    label: 'Flooring',
    icon: 'AlignJustify',
    color: '#f59e0b',
    drawMode: 'polygon',
    unit: 'm²',
    description: 'Floor area with waste factor',
    materialInputs: [
      { key: 'wasteFactor', label: 'Waste %', type: 'number', defaultValue: 10 },
    ],
  },
  {
    type: 'tiles',
    label: 'Tiles',
    icon: 'Grid2x2',
    color: '#06b6d4',
    drawMode: 'polygon',
    unit: 'm²',
    description: 'Tile area with size and waste',
    materialInputs: [
      {
        key: 'tileSize',
        label: 'Tile Size',
        type: 'select',
        defaultValue: '600x600',
        options: [
          { value: '300x300', label: '300×300mm' },
          { value: '400x400', label: '400×400mm' },
          { value: '600x600', label: '600×600mm' },
          { value: '800x800', label: '800×800mm' },
          { value: '600x1200', label: '600×1200mm' },
        ],
      },
      { key: 'wasteFactor', label: 'Waste %', type: 'number', defaultValue: 10 },
    ],
  },
  {
    type: 'excavation',
    label: 'Excavation',
    icon: 'Shovel',
    color: '#92400e',
    drawMode: 'polygon',
    unit: 'm³',
    description: 'Cut volume for excavation',
    materialInputs: [
      { key: 'depth', label: 'Depth', type: 'number', defaultValue: 1.5, unit: 'm' },
      {
        key: 'soilType',
        label: 'Soil Type',
        type: 'select',
        defaultValue: 'medium',
        options: [
          { value: 'light', label: 'Light (sandy)' },
          { value: 'medium', label: 'Medium' },
          { value: 'hard', label: 'Hard (rocky)' },
        ],
      },
    ],
  },
  {
    type: 'backfill',
    label: 'Backfill',
    icon: 'MoveDown',
    color: '#78716c',
    drawMode: 'polygon',
    unit: 'm³',
    description: 'Fill volume for backfill',
    materialInputs: [
      { key: 'depth', label: 'Depth', type: 'number', defaultValue: 1.0, unit: 'm' },
      { key: 'compactionFactor', label: 'Compaction Factor', type: 'number', defaultValue: 1.15 },
    ],
  },
  {
    type: 'asphalt',
    label: 'Asphalt',
    icon: 'Construction',
    color: '#1c1917',
    drawMode: 'polygon',
    unit: 'tonnes',
    description: 'Asphalt paving by area and depth',
    materialInputs: [
      { key: 'depth', label: 'Depth', type: 'number', defaultValue: 60, unit: 'mm' },
      { key: 'density', label: 'Density', type: 'number', defaultValue: 2400, unit: 'kg/m³' },
    ],
  },
  {
    type: 'count',
    label: 'Count',
    icon: 'Hash',
    color: '#10b981',
    drawMode: 'point',
    unit: 'nr',
    description: 'Count discrete items (doors, columns, etc.)',
  },
]

export function computeQuantity(
  toolType: TakeoffToolType,
  pixelMeasurement: number, // pixels² or pixels for line
  calibration: { pixelsPerMeter: number },
  materialSpec: Record<string, number | string>
): { quantity: number; unit: string } {
  const ppm = calibration.pixelsPerMeter

  switch (toolType) {
    case 'length':
    case 'calibrate':
      return { quantity: pixelMeasurement / ppm, unit: 'm' }

    case 'area':
    case 'rectangle':
    case 'circle':
    case 'blockwork':
    case 'plaster':
    case 'paint': {
      const areaM2 = pixelMeasurement / (ppm * ppm)
      return { quantity: areaM2, unit: 'm²' }
    }

    case 'flooring': {
      const areaM2 = pixelMeasurement / (ppm * ppm)
      const waste = 1 + (Number(materialSpec.wasteFactor ?? 10) / 100)
      return { quantity: areaM2 * waste, unit: 'm²' }
    }

    case 'tiles': {
      const areaM2 = pixelMeasurement / (ppm * ppm)
      const waste = 1 + (Number(materialSpec.wasteFactor ?? 10) / 100)
      return { quantity: areaM2 * waste, unit: 'm²' }
    }

    case 'volume':
    case 'concrete': {
      const areaM2 = pixelMeasurement / (ppm * ppm)
      const depth = Number(materialSpec.thickness ?? materialSpec.depth ?? 0.2)
      return { quantity: areaM2 * depth, unit: 'm³' }
    }

    case 'rebar': {
      const areaM2 = pixelMeasurement / (ppm * ppm)
      const diameter = Number(materialSpec.diameter ?? 12) / 1000 // m
      const spacing = Number(materialSpec.spacing ?? 200) / 1000 // m
      const layerCount = Number(materialSpec.layers ?? 2)
      const barsPerM2 = (1 / spacing) * layerCount * 2 // both ways
      const weightPerMeter = (diameter * diameter / 4) * Math.PI * 7850 // kg/m
      return { quantity: areaM2 * barsPerM2 * weightPerMeter, unit: 'kg' }
    }

    case 'excavation': {
      const areaM2 = pixelMeasurement / (ppm * ppm)
      const depth = Number(materialSpec.depth ?? 1.5)
      return { quantity: areaM2 * depth, unit: 'm³' }
    }

    case 'backfill': {
      const areaM2 = pixelMeasurement / (ppm * ppm)
      const depth = Number(materialSpec.depth ?? 1.0)
      const factor = Number(materialSpec.compactionFactor ?? 1.15)
      return { quantity: areaM2 * depth * factor, unit: 'm³' }
    }

    case 'asphalt': {
      const areaM2 = pixelMeasurement / (ppm * ppm)
      const depth = Number(materialSpec.depth ?? 60) / 1000 // mm to m
      const density = Number(materialSpec.density ?? 2400) // kg/m³
      return { quantity: (areaM2 * depth * density) / 1000, unit: 'tonnes' }
    }

    case 'count':
      return { quantity: pixelMeasurement, unit: 'nr' }

    default:
      return { quantity: 0, unit: '' }
  }
}
