'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import type { RateAnalysis, RateResource, ResourceType } from '@/lib/types'
import { RESOURCE_TYPES, MEASUREMENT_UNITS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import {
  getRateAnalyses,
  createRateAnalysis,
  updateRateAnalysis,
  deleteRateAnalysis,
  createRateResource,
  updateRateResource,
  deleteRateResource,
} from '@/app/actions/rate-analysis'
import { getBOQItems } from '@/app/actions/boq'
import type { BOQItem } from '@/lib/types'
import {
  Plus,
  Trash2,
  Calculator,
  ChevronDown,
  ChevronRight,
  Package,
  Users,
  Wrench,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const RESOURCE_ICONS: Record<ResourceType, React.ComponentType<{ size?: number; className?: string }>> = {
  material: Package,
  labor: Users,
  equipment: Wrench,
  subcontractor: Building2,
}

const RESOURCE_COLORS: Record<ResourceType, string> = {
  material: 'text-blue-600 dark:text-blue-400',
  labor: 'text-amber-600 dark:text-amber-400',
  equipment: 'text-purple-600 dark:text-purple-400',
  subcontractor: 'text-emerald-600 dark:text-emerald-400',
}

export default function RateAnalysisPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const [analyses, setAnalyses] = useState<RateAnalysis[]>([])
  const [boqItems, setBOQItems] = useState<BOQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    description: '',
    unit: 'm',
    output_qty: '1',
    overhead_pct: '10',
    profit_pct: '10',
    boq_item_id: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [ra, boq] = await Promise.all([
      getRateAnalyses(projectId),
      getBOQItems(projectId),
    ])
    setAnalyses(ra)
    setBOQItems(boq)
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.description.trim()) return
    setError(null)
    const result = await createRateAnalysis({
      project_id: projectId,
      description: form.description,
      unit: form.unit,
      output_qty: parseFloat(form.output_qty) || 1,
      overhead_pct: parseFloat(form.overhead_pct) || 0,
      profit_pct: parseFloat(form.profit_pct) || 0,
      boq_item_id: form.boq_item_id || undefined,
    })
    if (result.error) { setError(result.error); return }
    setShowCreate(false)
    setForm({ description: '', unit: 'm', output_qty: '1', overhead_pct: '10', profit_pct: '10', boq_item_id: '' })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rate analysis?')) return
    await deleteRateAnalysis(id)
    load()
  }

  const handleUpdateAnalysis = async (id: string, fields: Partial<RateAnalysis>) => {
    await updateRateAnalysis(id, fields)
    load()
  }

  const handleAddResource = async (raId: string, type: ResourceType) => {
    await createRateResource({
      rate_analysis_id: raId,
      resource_type: type,
      description: `New ${type}`,
    })
    load()
  }

  const handleUpdateResource = async (id: string, fields: Partial<RateResource>) => {
    await updateRateResource(id, fields)
    load()
  }

  const handleDeleteResource = async (id: string) => {
    await deleteRateResource(id)
    load()
  }

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const unlinkedBOQ = boqItems.filter(b => !analyses.some(a => a.boq_item_id === b.id))

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Rate Analysis</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Build up unit rates from materials, labor, equipment &amp; subcontractors
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New Analysis
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 animate-pulse" />
          ))}
        </div>
      ) : analyses.length === 0 ? (
        <div className="text-center py-20">
          <Calculator size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">No rate analyses yet</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Create rate analyses to build up unit rates for your BOQ items.
          </p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            Create First Analysis
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {analyses.map(ra => (
            <RateAnalysisCard
              key={ra.id}
              analysis={ra}
              isExpanded={expandedId === ra.id}
              onToggle={() => setExpandedId(expandedId === ra.id ? null : ra.id)}
              onDelete={() => handleDelete(ra.id)}
              onUpdate={(fields) => handleUpdateAnalysis(ra.id, fields)}
              onAddResource={(type) => handleAddResource(ra.id, type)}
              onUpdateResource={handleUpdateResource}
              onDeleteResource={handleDeleteResource}
              fmt={fmt}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Rate Analysis" size="md">
        <div className="space-y-4">
          {unlinkedBOQ.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Link to BOQ Item (optional)</label>
              <select
                value={form.boq_item_id}
                onChange={(e) => {
                  const boq = boqItems.find(b => b.id === e.target.value)
                  setForm(prev => ({
                    ...prev,
                    boq_item_id: e.target.value,
                    description: boq?.description ?? prev.description,
                    unit: boq?.unit ?? prev.unit,
                  }))
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None — standalone analysis</option>
                {unlinkedBOQ.map(b => (
                  <option key={b.id} value={b.id}>{b.code ? `${b.code} — ` : ''}{b.description}</option>
                ))}
              </select>
            </div>
          )}
          <Input
            label="Description"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="e.g. Reinforced concrete grade C30"
          />
          <div className="grid grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Unit</label>
              <select
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MEASUREMENT_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <Input label="Output Qty" type="number" value={form.output_qty} onChange={e => setForm({ ...form, output_qty: e.target.value })} />
            <Input label="Overhead %" type="number" value={form.overhead_pct} onChange={e => setForm({ ...form, overhead_pct: e.target.value })} />
            <Input label="Profit %" type="number" value={form.profit_pct} onChange={e => setForm({ ...form, profit_pct: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.description.trim()}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function RateAnalysisCard({
  analysis: ra,
  isExpanded,
  onToggle,
  onDelete,
  onUpdate,
  onAddResource,
  onUpdateResource,
  onDeleteResource,
  fmt,
}: {
  analysis: RateAnalysis
  isExpanded: boolean
  onToggle: () => void
  onDelete: () => void
  onUpdate: (fields: Partial<RateAnalysis>) => void
  onAddResource: (type: ResourceType) => void
  onUpdateResource: (id: string, fields: Partial<RateResource>) => void
  onDeleteResource: (id: string) => void
  fmt: (n: number) => string
}) {
  const resources = ra.resources ?? []
  const grouped = RESOURCE_TYPES.map(rt => ({
    ...rt,
    items: resources.filter(r => r.resource_type === rt.value).sort((a, b) => a.sort_order - b.sort_order),
    total: resources.filter(r => r.resource_type === rt.value).reduce((s, r) => s + r.total_amount, 0),
  }))

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
        onClick={onToggle}
      >
        {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-900 dark:text-white truncate">{ra.description}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            per {ra.output_qty} {ra.unit} · OH {ra.overhead_pct}% · Profit {ra.profit_pct}%
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{fmt(ra.unit_rate)}</div>
          <div className="text-[10px] text-slate-400">per {ra.unit}</div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-700">
          {/* Settings row */}
          <div className="flex items-center gap-4 px-4 py-2 bg-slate-50/50 dark:bg-slate-900/30 text-xs">
            <label className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">Output Qty:</span>
              <input
                type="number"
                value={ra.output_qty}
                onChange={e => onUpdate({ output_qty: parseFloat(e.target.value) || 1 })}
                className="w-16 px-1.5 py-0.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-white"
                step="any"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">Overhead:</span>
              <input
                type="number"
                value={ra.overhead_pct}
                onChange={e => onUpdate({ overhead_pct: parseFloat(e.target.value) || 0 })}
                className="w-14 px-1.5 py-0.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-white"
              />
              <span className="text-slate-400">%</span>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">Profit:</span>
              <input
                type="number"
                value={ra.profit_pct}
                onChange={e => onUpdate({ profit_pct: parseFloat(e.target.value) || 0 })}
                className="w-14 px-1.5 py-0.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-white"
              />
              <span className="text-slate-400">%</span>
            </label>
          </div>

          {/* Resource groups */}
          {grouped.map(group => {
            const Icon = RESOURCE_ICONS[group.value]
            const color = RESOURCE_COLORS[group.value]
            return (
              <div key={group.value} className="border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50/30 dark:bg-slate-900/20">
                  <Icon size={14} className={color} />
                  <span className={cn('text-xs font-semibold', color)}>{group.label}</span>
                  <span className="ml-auto text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                    {fmt(group.total)}
                  </span>
                  <button
                    onClick={() => onAddResource(group.value)}
                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                {group.items.map(res => (
                  <ResourceRow
                    key={res.id}
                    resource={res}
                    onUpdate={(fields) => onUpdateResource(res.id, fields)}
                    onDelete={() => onDeleteResource(res.id)}
                    fmt={fmt}
                  />
                ))}
              </div>
            )
          })}

          {/* Totals */}
          <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Direct Cost</span>
              <span className="font-medium text-slate-700 dark:text-slate-200 tabular-nums">{fmt(ra.direct_cost)}</span>
            </div>
            {ra.overhead_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Overheads ({ra.overhead_pct}%)</span>
                <span className="tabular-nums text-slate-600 dark:text-slate-300">{fmt(ra.overhead_amount)}</span>
              </div>
            )}
            {ra.profit_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Profit ({ra.profit_pct}%)</span>
                <span className="tabular-nums text-slate-600 dark:text-slate-300">{fmt(ra.profit_amount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-600">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Unit Rate (per {ra.unit})</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">{fmt(ra.unit_rate)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ResourceRow({
  resource: res,
  onUpdate,
  onDelete,
  fmt,
}: {
  resource: RateResource
  onUpdate: (fields: Partial<RateResource>) => void
  onDelete: () => void
  fmt: (n: number) => string
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')

  const startEdit = (field: string, value: string | number) => {
    setEditing(field)
    setEditVal(String(value))
  }

  const commit = (field: string) => {
    const numFields = ['quantity', 'unit_cost', 'waste_pct']
    const val = numFields.includes(field) ? parseFloat(editVal) || 0 : editVal
    onUpdate({ [field]: val })
    setEditing(null)
  }

  const cell = (field: string, value: string | number, isNum = false, width = 'w-16') => {
    if (editing === field) {
      return (
        <input
          autoFocus
          value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={() => commit(field)}
          onKeyDown={e => { if (e.key === 'Enter') commit(field); if (e.key === 'Escape') setEditing(null) }}
          className={cn(width, 'px-1 py-0.5 text-xs border border-blue-400 rounded bg-white dark:bg-slate-800 outline-none')}
          type={isNum ? 'number' : 'text'}
          step={isNum ? 'any' : undefined}
        />
      )
    }
    return (
      <span
        className={cn('cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 px-1 py-0.5 rounded', isNum && 'tabular-nums text-right')}
        onClick={() => startEdit(field, value)}
      >
        {isNum ? fmt(Number(value)) : value}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-750 group">
      <div className="flex-1 min-w-0">{cell('description', res.description, false, 'w-40')}</div>
      <div className="w-12 text-center">{cell('unit', res.unit, false, 'w-12')}</div>
      <div className="w-16 text-right">{cell('quantity', res.quantity, true)}</div>
      <div className="w-20 text-right">{cell('unit_cost', res.unit_cost, true, 'w-20')}</div>
      <div className="w-12 text-right">{cell('waste_pct', res.waste_pct, true, 'w-12')}</div>
      <div className="w-20 text-right font-medium tabular-nums">{fmt(res.total_amount)}</div>
      <button
        onClick={onDelete}
        className="p-0.5 rounded text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}
