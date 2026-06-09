'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SDRActivity, BOQItem } from '@/lib/types'
import { upsertActivities, deleteActivityRow } from '@/app/actions/reports'
import { Plus, Trash2, Save, Loader2, ClipboardList } from 'lucide-react'

interface Props {
  reportId: string
  projectId: string
  activities: SDRActivity[]
  boqItems: BOQItem[]
  readonly?: boolean
}

type Row = Omit<SDRActivity, 'created_at' | 'boq_item'>

export function ActivitiesSection({ reportId, projectId, activities, boqItems, readonly }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rows, setRows] = useState<Row[]>(activities)
  const [saved, setSaved] = useState(false)

  const addRow = () => setRows(r => [...r, {
    id: crypto.randomUUID(), report_id: reportId,
    boq_item_id: null, description: '', location_on_site: null,
    unit: null, quantity_done: 0, notes: null,
  }])

  const update = (idx: number, key: keyof Row, val: string | number | null) =>
    setRows(r => r.map((row, i) => i === idx ? { ...row, [key]: val } : row))

  const remove = (idx: number, id: string) => {
    if (id && activities.find(a => a.id === id)) {
      startTransition(async () => { await deleteActivityRow(id, reportId, projectId); router.refresh() })
    }
    setRows(r => r.filter((_, i) => i !== idx))
  }

  const save = () => {
    startTransition(async () => {
      const res = await upsertActivities(reportId, projectId, rows.filter(r => r.description))
      if (!res.error) { setSaved(true); setTimeout(() => setSaved(false), 2000); router.refresh() }
    })
  }

  const handleBoqSelect = (idx: number, boqId: string) => {
    const item = boqItems.find(b => b.id === boqId)
    setRows(r => r.map((row, i) => i === idx ? {
      ...row, boq_item_id: boqId || null,
      unit: item?.unit ?? row.unit,
    } : row))
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="text-amber-500" />
          <h3 className="font-semibold text-slate-800">Work Activities</h3>
          <span className="text-xs text-slate-400 ml-1">{rows.length} activit{rows.length !== 1 ? 'ies' : 'y'}</span>
        </div>
        {!readonly && (
          <div className="flex gap-2">
            <button onClick={addRow} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-amber-50 hover:border-amber-300 text-slate-600 transition-colors">
              <Plus size={12} /> Add Row
            </button>
            <button onClick={save} disabled={isPending} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white transition-colors disabled:opacity-50">
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-sm">
          {readonly ? 'No activities recorded.' : 'Click "Add Row" to log today\'s work activities.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left text-xs text-slate-500 px-4 py-2 font-medium w-1/3">Description</th>
                <th className="text-left text-xs text-slate-500 px-4 py-2 font-medium">BOQ Item</th>
                <th className="text-left text-xs text-slate-500 px-4 py-2 font-medium">Location</th>
                <th className="text-right text-xs text-slate-500 px-4 py-2 font-medium">Qty Done</th>
                <th className="text-left text-xs text-slate-500 px-4 py-2 font-medium">Unit</th>
                {!readonly && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">
                    {readonly ? <span>{row.description}</span> : (
                      <input value={row.description} onChange={e => update(idx, 'description', e.target.value)} placeholder="Work activity description"
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {readonly ? (
                      <span className="text-xs text-slate-500">{row.boq_item_id ? boqItems.find(b => b.id === row.boq_item_id)?.item_code ?? '—' : '—'}</span>
                    ) : (
                      <select value={row.boq_item_id ?? ''} onChange={e => handleBoqSelect(idx, e.target.value)}
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400 max-w-[180px]">
                        <option value="">— Link BOQ —</option>
                        {boqItems.map(b => <option key={b.id} value={b.id}>{b.item_code} — {b.description.slice(0, 30)}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {readonly ? <span>{row.location_on_site ?? '—'}</span> : (
                      <input value={row.location_on_site ?? ''} onChange={e => update(idx, 'location_on_site', e.target.value || null)} placeholder="Grid ref / level"
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {readonly ? <span className="block text-right">{row.quantity_done}</span> : (
                      <input type="number" min="0" step="0.01" value={row.quantity_done} onChange={e => update(idx, 'quantity_done', parseFloat(e.target.value) || 0)}
                        className="w-24 text-xs border border-slate-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-amber-400 ml-auto block" />
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {readonly ? row.unit ?? '—' : (
                      <input value={row.unit ?? ''} onChange={e => update(idx, 'unit', e.target.value || null)} placeholder="m², m³"
                        className="w-16 text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                    )}
                  </td>
                  {!readonly && (
                    <td className="px-4 py-2">
                      <button onClick={() => remove(idx, row.id)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
