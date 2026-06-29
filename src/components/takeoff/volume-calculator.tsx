'use client'

import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Box,
  Layers,
  Cylinder,
  RectangleHorizontal,
  Minus,
  Calculator,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface VolumeCalculatorProps {
  isOpen: boolean
  onClose: () => void
  onAddMeasurement?: (item: { description: string; quantity: number; unit: string }) => void
  drawingMeasurements?: Array<{ id: string; label: string; quantity: number; unit: string }>
}

interface Preset {
  id: string
  name: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  formula: string
  fields: { key: string; label: string; unit: string }[]
  calc: (v: Record<string, number>) => number
}

const PRESETS: Preset[] = [
  {
    id: 'slab',
    name: 'Slab',
    icon: Layers,
    formula: 'L × W × D',
    fields: [
      { key: 'L', label: 'Length', unit: 'm' },
      { key: 'W', label: 'Width', unit: 'm' },
      { key: 'D', label: 'Depth', unit: 'm' },
    ],
    calc: (v) => (v.L ?? 0) * (v.W ?? 0) * (v.D ?? 0),
  },
  {
    id: 'excavation',
    name: 'Excavation',
    icon: Minus,
    formula: '((Tw + Bw) / 2) × D × L',
    fields: [
      { key: 'Tw', label: 'Top Width', unit: 'm' },
      { key: 'Bw', label: 'Bottom Width', unit: 'm' },
      { key: 'D', label: 'Depth', unit: 'm' },
      { key: 'L', label: 'Length', unit: 'm' },
    ],
    calc: (v) => ((v.Tw ?? 0) + (v.Bw ?? 0)) / 2 * (v.D ?? 0) * (v.L ?? 0),
  },
  {
    id: 'column',
    name: 'Concrete Column',
    icon: Cylinder,
    formula: 'π × r² × h',
    fields: [
      { key: 'r', label: 'Radius', unit: 'm' },
      { key: 'h', label: 'Height', unit: 'm' },
    ],
    calc: (v) => Math.PI * Math.pow(v.r ?? 0, 2) * (v.h ?? 0),
  },
  {
    id: 'rect_column',
    name: 'Rectangular Column',
    icon: Box,
    formula: 'W × D × H × N',
    fields: [
      { key: 'W', label: 'Width', unit: 'm' },
      { key: 'D', label: 'Depth', unit: 'm' },
      { key: 'H', label: 'Height', unit: 'm' },
      { key: 'N', label: 'Number', unit: 'nr' },
    ],
    calc: (v) => (v.W ?? 0) * (v.D ?? 0) * (v.H ?? 0) * (v.N ?? 1),
  },
  {
    id: 'beam',
    name: 'Beam',
    icon: RectangleHorizontal,
    formula: 'W × H × L × N',
    fields: [
      { key: 'W', label: 'Width', unit: 'm' },
      { key: 'H', label: 'Height', unit: 'm' },
      { key: 'L', label: 'Length', unit: 'm' },
      { key: 'N', label: 'Number', unit: 'nr' },
    ],
    calc: (v) => (v.W ?? 0) * (v.H ?? 0) * (v.L ?? 0) * (v.N ?? 1),
  },
  {
    id: 'trench',
    name: 'Trench Fill',
    icon: Minus,
    formula: 'W × D × L × N',
    fields: [
      { key: 'W', label: 'Width', unit: 'm' },
      { key: 'D', label: 'Depth', unit: 'm' },
      { key: 'L', label: 'Length', unit: 'm' },
      { key: 'N', label: 'Number', unit: 'nr' },
    ],
    calc: (v) => (v.W ?? 0) * (v.D ?? 0) * (v.L ?? 0) * (v.N ?? 1),
  },
]

export function VolumeCalculator({ isOpen, onClose, onAddMeasurement, drawingMeasurements }: VolumeCalculatorProps) {
  const [activePreset, setActivePreset] = useState<string>('slab')
  const [values, setValues] = useState<Record<string, number>>({})
  const [description, setDescription] = useState('')
  const [customMode, setCustomMode] = useState(false)
  const [customFormula, setCustomFormula] = useState('')
  const [customVars, setCustomVars] = useState<Record<string, number>>({})
  const [linkedField, setLinkedField] = useState<string>('')
  const [linkedMeasurement, setLinkedMeasurement] = useState<string>('')

  const preset = PRESETS.find(p => p.id === activePreset)!
  const volume = useMemo(() => {
    if (customMode) {
      try {
        const sanitized = customFormula.replace(/[^0-9+\-*/().LWDHNRlwdhnr\s]/g, '')
        if (!sanitized || sanitized !== customFormula.trim()) return 0
        if (/\*\*|__|\\|;|=|\[|\]|\{|\}/g.test(sanitized)) return 0
        const vars = customVars
        let expr = sanitized
        for (const [k, v] of Object.entries(vars)) {
          expr = expr.replace(new RegExp(`\\b${k}\\b`, 'g'), String(v ?? 0))
        }
        if (/[a-zA-Z]/.test(expr)) return 0
        const result = Function(`"use strict"; return (${expr})`)()
        return typeof result === 'number' && isFinite(result) ? result : 0
      } catch {
        return 0
      }
    }
    const merged = { ...values }
    if (linkedField && linkedMeasurement && drawingMeasurements) {
      const m = drawingMeasurements.find(dm => dm.id === linkedMeasurement)
      if (m) merged[linkedField] = m.quantity
    }
    return preset.calc(merged)
  }, [customMode, customFormula, customVars, preset, values, linkedField, linkedMeasurement, drawingMeasurements])

  const handleAdd = () => {
    if (!onAddMeasurement || volume <= 0) return
    onAddMeasurement({
      description: description || `${customMode ? 'Custom' : preset.name} Volume`,
      quantity: Math.round(volume * 1000) / 1000,
      unit: 'm³',
    })
    setDescription('')
    setValues({})
    onClose()
  }

  const setField = (key: string, val: string) => {
    const n = parseFloat(val)
    setValues(prev => ({ ...prev, [key]: isNaN(n) ? 0 : n }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Volume Calculator" size="md">
      <div className="space-y-4">
        {/* Preset / Custom toggle */}
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 pb-2">
          <button
            onClick={() => setCustomMode(false)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              !customMode ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Calculator size={12} className="inline mr-1" /> Presets
          </button>
          <button
            onClick={() => setCustomMode(true)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              customMode ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            Custom Formula
          </button>
        </div>

        {!customMode ? (
          <>
            {/* Preset selector */}
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map(p => {
                const Icon = p.icon
                return (
                  <button
                    key={p.id}
                    onClick={() => { setActivePreset(p.id); setValues({}) }}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs transition-colors',
                      activePreset === p.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    )}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{p.name}</span>
                  </button>
                )
              })}
            </div>

            {/* Formula display */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-center">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Formula</span>
              <div className="text-lg font-mono font-bold text-slate-900 dark:text-white mt-1">{preset.formula}</div>
            </div>

            {/* Input fields */}
            <div className="grid grid-cols-2 gap-3">
              {preset.fields.map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">
                    {f.label} ({f.unit})
                    {drawingMeasurements && drawingMeasurements.length > 0 && (
                      <button
                        onClick={() => setLinkedField(linkedField === f.key ? '' : f.key)}
                        className={cn('ml-2 text-[10px]', linkedField === f.key ? 'text-blue-600' : 'text-slate-400 hover:text-blue-500')}
                      >
                        [Link]
                      </button>
                    )}
                  </label>
                  {linkedField === f.key ? (
                    <select
                      value={linkedMeasurement}
                      onChange={e => setLinkedMeasurement(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-blue-300 dark:border-blue-600 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select measurement...</option>
                      {drawingMeasurements!.map(dm => (
                        <option key={dm.id} value={dm.id}>{dm.label} ({dm.quantity} {dm.unit})</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type="number"
                      step="any"
                      value={values[f.key] ?? ''}
                      onChange={e => setField(f.key, e.target.value)}
                      placeholder="0"
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Custom formula */}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">
                Formula (use variable names like L, W, D)
              </label>
              <Input
                value={customFormula}
                onChange={e => setCustomFormula(e.target.value)}
                placeholder="e.g. L * W * D"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['L', 'W', 'D', 'H', 'N', 'R'].map(v => (
                <div key={v}>
                  <label className="text-xs text-slate-500">{v}</label>
                  <Input
                    type="number"
                    step="any"
                    value={customVars[v] ?? ''}
                    onChange={e => setCustomVars(prev => ({ ...prev, [v]: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Result */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 text-center">
          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Volume</span>
          <div className="text-3xl font-bold tabular-nums text-blue-700 dark:text-blue-300 mt-1">
            {volume.toFixed(3)} <span className="text-lg">m³</span>
          </div>
        </div>

        {/* Add to measurement book */}
        {onAddMeasurement && (
          <div className="flex items-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex-1">
              <Input
                label="Description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={`${customMode ? 'Custom' : preset.name} volume`}
              />
            </div>
            <Button onClick={handleAdd} disabled={volume <= 0}>
              <Plus size={14} /> Add to Measurements
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
