'use client'

import {
  Ruler, Minus, Square, Box, Layers, GitBranch, Grid3x3,
  PaintRoller, Paintbrush, AlignJustify, Grid2x2, Shovel,
  MoveDown, Construction, Hash, Circle as CircleIcon, RectangleHorizontal,
} from 'lucide-react'
import { TAKEOFF_TOOLS, TakeoffToolType, MaterialInput } from '@/lib/takeoff-tools'

const ICON_MAP: Record<string, React.ReactNode> = {
  Ruler: <Ruler size={15} />,
  Minus: <Minus size={15} />,
  Square: <Square size={15} />,
  Box: <Box size={15} />,
  Layers: <Layers size={15} />,
  GitBranch: <GitBranch size={15} />,
  Grid3x3: <Grid3x3 size={15} />,
  PaintRoller: <PaintRoller size={15} />,
  Paintbrush: <Paintbrush size={15} />,
  AlignJustify: <AlignJustify size={15} />,
  Grid2x2: <Grid2x2 size={15} />,
  Shovel: <Shovel size={15} />,
  MoveDown: <MoveDown size={15} />,
  Construction: <Construction size={15} />,
  Hash: <Hash size={15} />,
  CircleDot: <CircleIcon size={15} />,
  RectangleHorizontal: <RectangleHorizontal size={15} />,
}

const CATEGORIES: { label: string; types: TakeoffToolType[] }[] = [
  { label: 'Scale', types: ['calibrate'] },
  { label: 'Linear', types: ['length', 'count'] },
  { label: 'Area', types: ['area', 'rectangle', 'circle', 'flooring', 'tiles', 'blockwork', 'plaster', 'paint'] },
  { label: 'Volume', types: ['volume', 'concrete', 'excavation', 'backfill', 'asphalt'] },
  { label: 'Structural', types: ['rebar'] },
]

interface Props {
  activeTool: TakeoffToolType | null
  materialSpec: Record<string, number | string>
  onSelectTool: (type: TakeoffToolType) => void
  onMaterialSpecChange: (key: string, value: number | string) => void
}

export function ToolPanel({ activeTool, materialSpec, onSelectTool, onMaterialSpecChange }: Props) {
  const activeConfig = activeTool ? TAKEOFF_TOOLS.find(t => t.type === activeTool) : null

  return (
    <div className="flex flex-col gap-0 flex-1 min-h-0 bg-slate-900 overflow-y-auto">
      {CATEGORIES.map(cat => (
        <div key={cat.label} className="px-2 pt-2">
          <p className="text-xs text-slate-600 uppercase tracking-wider mb-1 px-1">{cat.label}</p>
          {cat.types.map(type => {
            const cfg = TAKEOFF_TOOLS.find(t => t.type === type)!
            const isActive = activeTool === type
            return (
              <button
                key={type}
                title={cfg.description}
                onClick={() => onSelectTool(type)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all mb-0.5 ${
                  isActive
                    ? 'bg-amber-500 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span
                  className={`shrink-0 ${isActive ? 'text-white' : ''}`}
                  style={isActive ? {} : { color: cfg.color }}
                >
                  {ICON_MAP[cfg.icon]}
                </span>
                <span className="truncate">{cfg.label}</span>
              </button>
            )
          })}
        </div>
      ))}

      {/* Material inputs */}
      {activeConfig?.materialInputs && activeConfig.materialInputs.length > 0 && (
        <div className="mx-2 mt-3 mb-2 bg-slate-800 rounded-lg p-2.5 space-y-2">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
            {activeConfig.label} Options
          </p>
          {activeConfig.materialInputs.map((input: MaterialInput) => (
            <div key={input.key}>
              <label className="block text-xs text-slate-500 mb-0.5">
                {input.label}{input.unit ? ` (${input.unit})` : ''}
              </label>
              {input.type === 'select' ? (
                <select
                  value={String(materialSpec[input.key] ?? input.defaultValue)}
                  onChange={e => onMaterialSpecChange(input.key, e.target.value)}
                  className="w-full text-xs bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 focus:outline-none focus:border-amber-500"
                >
                  {input.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={Number(materialSpec[input.key] ?? input.defaultValue)}
                  onChange={e => onMaterialSpecChange(input.key, parseFloat(e.target.value) || 0)}
                  className="w-full text-xs bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 focus:outline-none focus:border-amber-500"
                  step="any"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
