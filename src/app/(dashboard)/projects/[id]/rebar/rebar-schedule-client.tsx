'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react'
import {
  createRebarElement,
  deleteRebarElement,
} from '@/app/actions/rebar'
import { useTranslation } from '@/lib/i18n/use-translation'

interface RebarBar {
  id: string
  bar_mark: string
  diameter_mm: number
  shape_code: string
  quantity: number
  cut_length_mm: number | null
  total_weight_kg: number | null
}

interface RebarElement {
  id: string
  element_type: string
  element_mark: string
  floor_level: string | null
  notes: string | null
  bars: RebarBar[]
}

const ELEMENT_TYPES = ['beam','column','slab','footing','wall','stair','pile','raft','other'] as const

interface Props {
  projectId: string
  initialElements: RebarElement[]
}

export function RebarScheduleClient({ projectId, initialElements }: Props) {
  const { t } = useTranslation()
  const [elements, setElements] = useState<RebarElement[]>(initialElements)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ element_type: 'beam', element_mark: '', floor_level: '' })
  const [, startTransition] = useTransition()

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleAdd() {
    if (!form.element_mark.trim()) return
    startTransition(async () => {
      const result = await createRebarElement({
        project_id: projectId,
        element_type: form.element_type,
        element_mark: form.element_mark.trim().toUpperCase(),
        floor_level: form.floor_level.trim() || null,
      })
      if (result.success && result.element) {
        setElements(prev => [...prev, { ...result.element, bars: [] } as RebarElement])
        setForm({ element_type: 'beam', element_mark: '', floor_level: '' })
        setAdding(false)
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this element and all its bars?')) return
    startTransition(async () => {
      await deleteRebarElement(id, projectId)
      setElements(prev => prev.filter(e => e.id !== id))
    })
  }

  const totalWeight = elements
    .flatMap(e => e.bars)
    .reduce((sum, b) => sum + (b.total_weight_kg ?? 0), 0)

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Summary bar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">
          {elements.length} {t('element_type', 'elements')} &nbsp;·&nbsp;
          {t('total_steel', 'Total steel')}: <span className="text-amber-400 font-semibold">{totalWeight.toFixed(2)} kg</span>
        </p>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-amber-600 hover:bg-amber-500 text-white transition-colors"
        >
          <Plus size={14} /> {t('add_element', 'Add Element')}
        </button>
      </div>

      {/* Add element form */}
      {adding && (
        <div className="mb-4 p-4 bg-slate-800 rounded-lg border border-slate-700 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('element_type', 'Type')}</label>
            <select
              value={form.element_type}
              onChange={e => setForm(f => ({ ...f, element_type: e.target.value }))}
              className="bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-amber-500"
            >
              {ELEMENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('element_mark', 'Mark')} *</label>
            <input
              value={form.element_mark}
              onChange={e => setForm(f => ({ ...f, element_mark: e.target.value }))}
              placeholder="e.g. B1, C2, F3"
              className="bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-amber-500 w-32"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('floor_level', 'Floor/Level')}</label>
            <input
              value={form.floor_level}
              onChange={e => setForm(f => ({ ...f, floor_level: e.target.value }))}
              placeholder="e.g. GF, 1F, Roof"
              className="bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-amber-500 w-28"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 text-sm rounded bg-amber-600 hover:bg-amber-500 text-white transition-colors"
            >{t('save', 'Save')}</button>
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-1.5 text-sm rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >{t('cancel', 'Cancel')}</button>
          </div>
        </div>
      )}

      {/* Elements table */}
      {elements.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg mb-2">{t('no_elements', 'No rebar elements yet')}</p>
          <p className="text-sm">{t('no_elements_hint', 'Add beams, columns, slabs, footings, and other structural elements')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {elements.map(el => {
            const elWeight = el.bars.reduce((s, b) => s + (b.total_weight_kg ?? 0), 0)
            const isExpanded = expanded.has(el.id)
            return (
              <div key={el.id} className="bg-slate-900 rounded-lg border border-slate-800">
                {/* Element header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-800/50 rounded-lg transition-colors"
                  onClick={() => toggleExpand(el.id)}
                >
                  {isExpanded ? <ChevronDown size={14} className="text-slate-500 shrink-0" /> : <ChevronRight size={14} className="text-slate-500 shrink-0" />}
                  <span className="text-xs uppercase tracking-wider text-amber-400 w-16 shrink-0">{el.element_type}</span>
                  <span className="font-mono font-bold text-white w-20 shrink-0">{el.element_mark}</span>
                  {el.floor_level && <span className="text-xs text-slate-500 w-20 shrink-0">{el.floor_level}</span>}
                  <span className="text-xs text-slate-500 flex-1">{el.bars.length} {t('bars', 'bars')}</span>
                  <span className="text-sm font-semibold text-green-400 w-28 text-right">{elWeight.toFixed(2)} kg</span>
                  <Link
                    href={`/projects/${projectId}/rebar/${el.id}`}
                    onClick={e => e.stopPropagation()}
                    className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors shrink-0"
                  >
                    {t('edit_bbs', 'Edit BBS')}
                  </Link>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(el.id) }}
                    className="p-1 rounded hover:bg-red-900/50 text-slate-600 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Bars preview */}
                {isExpanded && el.bars.length > 0 && (
                  <div className="px-4 pb-3 border-t border-slate-800">
                    <table className="w-full text-xs mt-2">
                      <thead>
                        <tr className="text-slate-500">
                          <th className="text-left py-1 pr-3 font-medium">{t('bar_mark', 'Mark')}</th>
                          <th className="text-left py-1 pr-3 font-medium">{t('diameter', 'Dia.')}</th>
                          <th className="text-left py-1 pr-3 font-medium">{t('shape_code', 'Shape')}</th>
                          <th className="text-right py-1 pr-3 font-medium">{t('quantity', 'Qty')}</th>
                          <th className="text-right py-1 pr-3 font-medium">{t('cut_length', 'Cut L')} (mm)</th>
                          <th className="text-right py-1 font-medium">{t('weight', 'Weight')} (kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {el.bars.map(bar => (
                          <tr key={bar.id} className="border-t border-slate-800/50">
                            <td className="py-1 pr-3 font-mono text-white">{bar.bar_mark}</td>
                            <td className="py-1 pr-3 text-amber-300">T{bar.diameter_mm}</td>
                            <td className="py-1 pr-3 text-slate-400">{bar.shape_code}</td>
                            <td className="py-1 pr-3 text-right text-slate-300">{bar.quantity}</td>
                            <td className="py-1 pr-3 text-right text-slate-300">{bar.cut_length_mm?.toFixed(0) ?? '—'}</td>
                            <td className="py-1 text-right text-green-400">{bar.total_weight_kg?.toFixed(3) ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
