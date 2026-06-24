'use client'

import {
  MousePointer2,
  Hand,
  Ruler,
  Spline,
  Pentagon,
  Square,
  Circle,
  Hash,
  Crosshair,
  Undo2,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TakeoffMeasurement } from '@/lib/takeoff/renderer'

interface TakeoffToolbarProps {
  activeTool: string | null
  onToolChange: (tool: string | null) => void
  onCalibrate: () => void
  isCalibrating: boolean
  measurements: TakeoffMeasurement[]
  onDeleteMeasurement: (id: string) => void
  onUndo: () => void
  canUndo: boolean
  activeColor: string
  onColorChange: (color: string) => void
}

const COLORS = [
  '#3B82F6', '#EF4444', '#22C55E', '#F97316',
  '#8B5CF6', '#06B6D4', '#EAB308', '#EC4899',
]

const TOOLS = [
  { id: 'select', icon: MousePointer2, label: 'Select', group: 'nav' },
  { id: 'pan', icon: Hand, label: 'Pan', group: 'nav' },
  { id: 'line', icon: Ruler, label: 'Line', group: 'measure' },
  { id: 'polyline', icon: Spline, label: 'Polyline', group: 'measure' },
  { id: 'area', icon: Pentagon, label: 'Area', group: 'measure' },
  { id: 'rectangle', icon: Square, label: 'Rectangle', group: 'measure' },
  { id: 'circle', icon: Circle, label: 'Circle', group: 'measure' },
  { id: 'count', icon: Hash, label: 'Count', group: 'measure' },
] as const

function ToolButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number }>
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'p-2 rounded-md transition-colors relative group',
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700',
      )}
    >
      <Icon size={18} />
      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-slate-900 text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
        {label}
      </span>
    </button>
  )
}

export function TakeoffToolbar({
  activeTool,
  onToolChange,
  onCalibrate,
  isCalibrating,
  onDeleteMeasurement,
  measurements,
  onUndo,
  canUndo,
  activeColor,
  onColorChange,
}: TakeoffToolbarProps) {
  const navTools = TOOLS.filter((t) => t.group === 'nav')
  const measureTools = TOOLS.filter((t) => t.group === 'measure')

  return (
    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-1.5 flex-wrap">
      {/* Navigation */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 dark:border-slate-700">
        {navTools.map((t) => (
          <ToolButton
            key={t.id}
            icon={t.icon}
            label={t.label}
            active={activeTool === t.id && !isCalibrating}
            onClick={() => onToolChange(t.id)}
          />
        ))}
      </div>

      {/* Measurement tools */}
      <div className="flex items-center gap-0.5 px-2 border-r border-slate-200 dark:border-slate-700">
        {measureTools.map((t) => (
          <ToolButton
            key={t.id}
            icon={t.icon}
            label={t.label}
            active={activeTool === t.id && !isCalibrating}
            onClick={() => onToolChange(t.id)}
          />
        ))}
      </div>

      {/* Calibration */}
      <div className="flex items-center gap-0.5 px-2 border-r border-slate-200 dark:border-slate-700">
        <ToolButton
          icon={Crosshair}
          label="Calibrate Scale"
          active={isCalibrating}
          onClick={onCalibrate}
        />
      </div>

      {/* Color picker */}
      <div className="flex items-center gap-1 px-2 border-r border-slate-200 dark:border-slate-700">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            title={c}
            className={cn(
              'w-5 h-5 rounded-full border-2 transition-transform',
              activeColor === c
                ? 'border-slate-900 dark:border-white scale-110'
                : 'border-transparent hover:scale-110',
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 pl-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
          className="p-2 rounded-md text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={() => {
            const active = measurements.find(() => false) // delete selected handled by parent
            if (active) onDeleteMeasurement(active.id)
          }}
          title="Delete Selected"
          className="p-2 rounded-md text-slate-600 hover:bg-red-100 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-900/30 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  )
}
