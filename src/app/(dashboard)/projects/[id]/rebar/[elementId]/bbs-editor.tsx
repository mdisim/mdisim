'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Download } from 'lucide-react'
import { createRebarBar, updateRebarBar, deleteRebarBar } from '@/app/actions/rebar'
import { ShapeCodeSVG } from './shape-code-svg'
import { REBAR_DIAMETERS } from '@/lib/rebar-calc'

interface RebarBar {
  id: string
  bar_mark: string
  diameter_mm: number
  shape_code: string
  bending_dims: Record<string, number>
  quantity: number
  cut_length_mm: number | null
  unit_weight_kg_m: number | null
  total_weight_kg: number | null
  notes: string | null
}

const SHAPE_CODES = ['00','11','21','31','41','51','60','99'] as const

const SHAPE_DIMS: Record<string, string[]> = {
  '00': ['A'],
  '11': ['A','B'],
  '21': ['A','B'],
  '31': ['A','B','C'],
  '41': ['A','B','C'],
  '51': ['A','B'],
  '60': ['A','B','C'],
  '99': ['A'],
}

const BLANK_BAR = {
  bar_mark: '',
  diameter_mm: 12,
  shape_code: '00',
  bending_dims: { A: 0 } as Record<string, number>,
  quantity: 1,
  notes: '',
}

interface Props {
  elementId: string
  initialBars: RebarBar[]
}

export function BBSEditor({ elementId, initialBars }: Props) {
  const [bars, setBars] = useState<RebarBar[]>(initialBars)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<typeof BLANK_BAR>(BLANK_BAR)
  const [, startTransition] = useTransition()

  const totalWeight = bars.reduce((s, b) => s + (b.total_weight_kg ?? 0), 0)

  function startAdd() {
    setEditingId('new')
    setDraft(BLANK_BAR)
  }

  function startEdit(bar: RebarBar) {
    setEditingId(bar.id)
    setDraft({
      bar_mark: bar.bar_mark,
      diameter_mm: bar.diameter_mm,
      shape_code: bar.shape_code,
      bending_dims: bar.bending_dims,
      quantity: bar.quantity,
      notes: bar.notes ?? '',
    })
  }

  function setDim(key: string, value: number) {
    setDraft(d => ({ ...d, bending_dims: { ...d.bending_dims, [key]: value } }))
  }

  function handleSave() {
    if (!draft.bar_mark.trim()) return
    const dims = draft.bending_dims

    startTransition(async () => {
      if (editingId === 'new') {
        const result = await createRebarBar({
          element_id: elementId,
          bar_mark: draft.bar_mark.toUpperCase(),
          diameter_mm: draft.diameter_mm,
          shape_code: draft.shape_code,
          bending_dims: dims,
          quantity: draft.quantity,
          notes: draft.notes || null,
        })
        if (result.success && result.bar) {
          setBars(prev => [...prev, result.bar as RebarBar])
        }
      } else if (editingId) {
        await updateRebarBar(editingId, {
          bar_mark: draft.bar_mark.toUpperCase(),
          diameter_mm: draft.diameter_mm,
          shape_code: draft.shape_code,
          bending_dims: dims,
          quantity: draft.quantity,
          notes: draft.notes || null,
        })
        // Re-fetch updated bar (weights recomputed server-side)
        const updated = await fetch(`/api/rebar/bar/${editingId}`).catch(() => null)
        if (updated?.ok) {
          const data = await updated.json()
          setBars(prev => prev.map(b => b.id === editingId ? data.bar : b))
        } else {
          // Optimistic fallback — mark dirty
          setBars(prev => prev.map(b => b.id === editingId ? {
            ...b,
            bar_mark: draft.bar_mark.toUpperCase(),
            diameter_mm: draft.diameter_mm,
            shape_code: draft.shape_code,
            bending_dims: dims,
            quantity: draft.quantity,
            notes: draft.notes || null,
            cut_length_mm: null,
            unit_weight_kg_m: null,
            total_weight_kg: null,
          } : b))
        }
      }
      setEditingId(null)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this bar?')) return
    startTransition(async () => {
      await deleteRebarBar(id)
      setBars(prev => prev.filter(b => b.id !== id))
    })
  }

  function handleExportCSV() {
    const header = 'Mark,Diameter,Shape,A,B,C,Qty,Cut Length (mm),Unit Wt (kg/m),Total Wt (kg)\n'
    const rows = bars.map(b => {
      const dims = b.bending_dims
      return [
        b.bar_mark, `T${b.diameter_mm}`, b.shape_code,
        dims.A ?? '', dims.B ?? '', dims.C ?? '',
        b.quantity, b.cut_length_mm ?? '', b.unit_weight_kg_m ?? '', b.total_weight_kg ?? ''
      ].join(',')
    }).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'bbs.csv'
    a.click()
  }

  const dimKeys = SHAPE_DIMS[draft.shape_code] ?? ['A']

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">
          {bars.length} bar{bars.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
          Total: <span className="text-green-400 font-semibold">{totalWeight.toFixed(3)} kg</span>
          {totalWeight >= 1000 && <span className="ml-2 text-green-400">({(totalWeight/1000).toFixed(3)} t)</span>}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          >
            <Download size={13} /> CSV
          </button>
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-amber-600 hover:bg-amber-500 text-white transition-colors"
          >
            <Plus size={13} /> Add Bar
          </button>
        </div>
      </div>

      {/* Edit / Add form */}
      {editingId && (
        <div className="mb-5 p-4 bg-slate-800 rounded-lg border border-amber-500/30">
          <h3 className="text-sm font-semibold text-amber-400 mb-3">{editingId === 'new' ? 'Add Bar' : 'Edit Bar'}</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Mark *</label>
              <input
                value={draft.bar_mark}
                onChange={e => setDraft(d => ({ ...d, bar_mark: e.target.value }))}
                placeholder="01"
                className="bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded px-2 py-1.5 w-20 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Dia. (mm)</label>
              <select
                value={draft.diameter_mm}
                onChange={e => setDraft(d => ({ ...d, diameter_mm: Number(e.target.value) }))}
                className="bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-amber-500"
              >
                {REBAR_DIAMETERS.map(d => <option key={d} value={d}>T{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Shape Code</label>
              <select
                value={draft.shape_code}
                onChange={e => {
                  const sc = e.target.value
                  const keys = SHAPE_DIMS[sc] ?? ['A']
                  const freshDims: Record<string,number> = {}
                  for (const k of keys) freshDims[k] = (draft.bending_dims[k] ?? 0)
                  setDraft(d => ({ ...d, shape_code: sc, bending_dims: freshDims }))
                }}
                className="bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded px-2 py-1.5 focus:outline-none focus:border-amber-500"
              >
                {SHAPE_CODES.map(sc => <option key={sc} value={sc}>{sc}</option>)}
              </select>
            </div>
            {dimKeys.map(key => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1">{key} (mm)</label>
                <input
                  type="number"
                  value={draft.bending_dims[key] ?? 0}
                  onChange={e => setDim(key, Number(e.target.value))}
                  className="bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded px-2 py-1.5 w-24 focus:outline-none focus:border-amber-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Qty *</label>
              <input
                type="number"
                value={draft.quantity}
                min={1}
                onChange={e => setDraft(d => ({ ...d, quantity: Number(e.target.value) }))}
                className="bg-slate-900 border border-slate-600 text-slate-200 text-sm rounded px-2 py-1.5 w-20 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="px-3 py-1.5 text-sm rounded bg-amber-600 hover:bg-amber-500 text-white transition-colors">Save</button>
              <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-sm rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">Cancel</button>
            </div>
          </div>
          {/* Shape preview */}
          <div className="mt-3 flex items-center gap-3">
            <ShapeCodeSVG shapeCode={draft.shape_code} dims={draft.bending_dims} size={80} />
            <p className="text-xs text-slate-500">{shapeDescription(draft.shape_code)}</p>
          </div>
        </div>
      )}

      {/* BBS Table */}
      {bars.length === 0 ? (
        <div className="text-center py-12 text-slate-600">
          <p className="text-base mb-1">No bars defined</p>
          <p className="text-sm">Click &quot;Add Bar&quot; to start the bar bending schedule</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800 text-slate-400 text-xs">
                <th className="text-left px-3 py-2 font-medium">Mark</th>
                <th className="text-left px-3 py-2 font-medium">Dia.</th>
                <th className="text-center px-3 py-2 font-medium w-16">Shape</th>
                <th className="text-right px-3 py-2 font-medium">A</th>
                <th className="text-right px-3 py-2 font-medium">B</th>
                <th className="text-right px-3 py-2 font-medium">C</th>
                <th className="text-right px-3 py-2 font-medium">Qty</th>
                <th className="text-right px-3 py-2 font-medium">Cut L (mm)</th>
                <th className="text-right px-3 py-2 font-medium">Unit Wt (kg/m)</th>
                <th className="text-right px-3 py-2 font-medium">Total Wt (kg)</th>
                <th className="px-3 py-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {bars.map(bar => (
                <tr
                  key={bar.id}
                  className="border-t border-slate-800 hover:bg-slate-800/30 cursor-pointer"
                  onClick={() => startEdit(bar)}
                >
                  <td className="px-3 py-2 font-mono text-white font-bold">{bar.bar_mark}</td>
                  <td className="px-3 py-2 text-amber-300">T{bar.diameter_mm}</td>
                  <td className="px-3 py-2 text-center">
                    <ShapeCodeSVG shapeCode={bar.shape_code} dims={bar.bending_dims} size={32} />
                  </td>
                  <td className="px-3 py-2 text-right text-slate-300">{bar.bending_dims?.A ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-slate-300">{bar.bending_dims?.B ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-slate-300">{bar.bending_dims?.C ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-slate-300">{bar.quantity}</td>
                  <td className="px-3 py-2 text-right text-slate-200 font-mono">{bar.cut_length_mm?.toFixed(0) ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-slate-400">{bar.unit_weight_kg_m?.toFixed(4) ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-green-400 font-semibold">{bar.total_weight_kg?.toFixed(3) ?? '—'}</td>
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleDelete(bar.id)}
                      className="p-1 rounded hover:bg-red-900/50 text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-700 bg-slate-900">
                <td colSpan={9} className="px-3 py-2 text-right text-xs text-slate-500 font-medium uppercase tracking-wide">Total Weight</td>
                <td className="px-3 py-2 text-right text-green-400 font-bold">{totalWeight.toFixed(3)} kg</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function shapeDescription(code: string): string {
  const map: Record<string, string> = {
    '00': 'Straight bar — no bends',
    '11': 'L-bar — one 90° bend (A = long leg, B = short leg)',
    '21': 'U-bar — two 90° bends (A = top, B = legs)',
    '31': 'Z-bar — two 90° bends offset (crank bar)',
    '41': 'Open U-stirrup — three 90° bends',
    '51': 'Closed stirrup / link — four 90° bends + hooks (A = width, B = height)',
    '60': 'Spiral / helix (A = pitch, B = coil dia, C = turns)',
    '99': 'Custom — enter total cut length in A',
  }
  return map[code] ?? ''
}
