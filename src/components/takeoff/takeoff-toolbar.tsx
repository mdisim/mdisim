'use client'

import { useState } from 'react'
import {
  MousePointer2,
  Hand,
  Ruler,
  Spline,
  Pentagon,
  Square,
  Circle,
  Hash,
  Hexagon,
  Layers,
  Crosshair,
  Undo2,
  Trash2,
  Magnet,
  Grid3X3,
  ChevronDown,
  Box,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TakeoffMeasurement } from '@/lib/takeoff/renderer'
import type { SnapConfig } from '@/lib/takeoff/geometry'

interface TakeoffToolbarProps {
  activeTool: string | null
  onToolChange: (tool: string | null) => void
  onCalibrate: () => void
  isCalibrating: boolean
  measurements: TakeoffMeasurement[]
  activeMeasurementId: string | null
  onDeleteMeasurement: (id: string) => void
  onUndo: () => void
  canUndo: boolean
  activeColor: string
  onColorChange: (color: string) => void
  snapConfig?: SnapConfig
  onSnapConfigChange?: (config: SnapConfig) => void
  showGrid?: boolean
  onGridToggle?: () => void
  onVolumeCalculator?: () => void
}

const COLORS = [
  '#3B82F6', '#EF4444', '#22C55E', '#F97316',
  '#8B5CF6', '#06B6D4', '#EAB308', '#EC4899',
]

const TOOLS = [
  { id: 'select', icon: MousePointer2, label: 'Select (V)', shortcut: 'V', group: 'nav' },
  { id: 'pan', icon: Hand, label: 'Pan (H)', shortcut: 'H', group: 'nav' },
  { id: 'line', icon: Ruler, label: 'Line (L)', shortcut: 'L', group: 'measure' },
  { id: 'polyline', icon: Spline, label: 'Polyline (P)', shortcut: 'P', group: 'measure' },
  { id: 'area', icon: Pentagon, label: 'Area (A)', shortcut: 'A', group: 'measure' },
  { id: 'rectangle', icon: Square, label: 'Rectangle (R)', shortcut: 'R', group: 'measure' },
  { id: 'circle', icon: Circle, label: 'Circle (O)', shortcut: 'O', group: 'measure' },
  { id: 'count', icon: Hash, label: 'Count (N)', shortcut: 'N', group: 'measure' },
  { id: 'polygon', icon: Hexagon, label: 'Polygon (G)', shortcut: 'G', group: 'measure' },
  { id: 'wall', icon: Layers, label: 'Wall Area (W)', shortcut: 'W', group: 'measure' },
] as const

function ToolButton({
  icon: Icon,
  label,
  active,
  onClick,
  className,
}: {
  icon: React.ComponentType<{ size?: number }>
  label: string
  active: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'p-2 rounded-md transition-colors relative group',
        active
          ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700',
        className,
      )}
    >
      <Icon size={20} />
      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-slate-900 text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
        {label}
      </span>
    </button>
  )
}

function SnapMenu({ config, onChange }: { config: SnapConfig; onChange: (c: SnapConfig) => void }) {
  const [open, setOpen] = useState(false)

  const toggleField = (field: keyof SnapConfig) => {
    onChange({ ...config, [field]: !config[field] })
  }

  const SNAP_MODES = [
    { key: 'endpoint' as const, label: 'Endpoint', color: 'bg-yellow-500' },
    { key: 'midpoint' as const, label: 'Midpoint', color: 'bg-orange-500' },
    { key: 'intersection' as const, label: 'Intersection', color: 'bg-red-500' },
    { key: 'perpendicular' as const, label: 'Perpendicular', color: 'bg-cyan-500' },
    { key: 'nearest' as const, label: 'Nearest', color: 'bg-green-500' },
    { key: 'grid' as const, label: 'Grid', color: 'bg-violet-500' },
    { key: 'parallel' as const, label: 'Parallel', color: 'bg-indigo-500' },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        title="Snap Settings"
        className={cn(
          'flex items-center gap-1 px-2 py-2 rounded-md transition-colors',
          config.enabled
            ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
            : 'text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700',
        )}
      >
        <Magnet size={18} />
        <ChevronDown size={12} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-2 min-w-[180px]">
            <label className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 rounded">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={() => toggleField('enabled')}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Snap Enabled
            </label>
            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
            {SNAP_MODES.map(mode => (
              <label
                key={mode.key}
                className="flex items-center gap-2 px-2 py-1 text-sm text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 rounded"
              >
                <input
                  type="checkbox"
                  checked={config[mode.key]}
                  onChange={() => toggleField(mode.key)}
                  disabled={!config.enabled}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={cn('w-2 h-2 rounded-full', mode.color)} />
                {mode.label}
              </label>
            ))}
            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
            <div className="px-2 py-1">
              <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Snap Radius
              </label>
              <input
                type="range"
                min={5}
                max={30}
                value={config.snapRadius}
                onChange={e => onChange({ ...config, snapRadius: Number(e.target.value) })}
                className="w-full h-1 mt-1"
              />
              <span className="text-xs text-slate-500">{config.snapRadius}px</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function TakeoffToolbar({
  activeTool,
  onToolChange,
  onCalibrate,
  isCalibrating,
  onDeleteMeasurement,
  measurements,
  activeMeasurementId,
  onUndo,
  canUndo,
  activeColor,
  onColorChange,
  snapConfig,
  onSnapConfigChange,
  showGrid,
  onGridToggle,
  onVolumeCalculator,
}: TakeoffToolbarProps) {
  const navTools = TOOLS.filter((t) => t.group === 'nav')
  const measureTools = TOOLS.filter((t) => t.group === 'measure')

  return (
    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-1.5 flex-wrap shadow-[0_2px_4px_rgba(0,0,0,0.06)]">
      {/* Navigation */}
      <div className="flex flex-col items-center pr-2 border-r border-slate-200 dark:border-slate-700">
        <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">Navigation</span>
        <div className="flex items-center gap-0.5">
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
      </div>

      {/* Measurement tools */}
      <div className="flex flex-col items-center px-2 border-r border-slate-200 dark:border-slate-700">
        <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">Measurement</span>
        <div className="flex items-center gap-0.5">
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

      {/* Snap & Grid */}
      <div className="flex items-center gap-0.5 px-2 border-r border-slate-200 dark:border-slate-700">
        {snapConfig && onSnapConfigChange && (
          <SnapMenu config={snapConfig} onChange={onSnapConfigChange} />
        )}
        {onGridToggle && (
          <ToolButton
            icon={Grid3X3}
            label="Grid (G)"
            active={showGrid ?? false}
            onClick={onGridToggle}
          />
        )}
      </div>

      {/* Volume Calculator */}
      {onVolumeCalculator && (
        <div className="flex items-center gap-0.5 px-2 border-r border-slate-200 dark:border-slate-700">
          <ToolButton
            icon={Box}
            label="Volume Calculator"
            active={false}
            onClick={onVolumeCalculator}
          />
        </div>
      )}

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
          title="Undo (Ctrl+Z)"
          className="p-2 rounded-md text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={() => {
            if (activeMeasurementId) onDeleteMeasurement(activeMeasurementId)
          }}
          title="Delete Selected (Del)"
          className="p-2 rounded-md text-slate-600 hover:bg-red-100 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-900/30 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  )
}
