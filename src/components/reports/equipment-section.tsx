'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SDREquipment } from '@/lib/types'
import { upsertEquipment, deleteEquipmentRow } from '@/app/actions/reports'
import { Plus, Trash2, Save, Loader2, Wrench } from 'lucide-react'

interface Props {
  reportId: string
  projectId: string
  equipment: SDREquipment[]
  readonly?: boolean
}

type Row = Omit<SDREquipment, 'created_at'>

const EQUIPMENT_TYPES = ['Excavator', 'Bulldozer', 'Crane', 'Concrete Mixer', 'Concrete Pump', 'Dump Truck', 'Forklift', 'Compactor', 'Generator', 'Scaffolding', 'Bar Bender', 'Welding Machine', 'Other']

export function EquipmentSection({ reportId, projectId, equipment, readonly }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rows, setRows] = useState<Row[]>(equipment)
  const [saved, setSaved] = useState(false)

  const addRow = () => setRows(r => [...r, {
    id: crypto.randomUUID(), report_id: reportId,
    equipment_name: '', equipment_type: null, quantity: 1,
    hours_used: 0, idle_hours: 0, operator_name: null, notes: null,
  }])

  const update = (idx: number, key: keyof Row, val: string | number | null) =>
    setRows(r => r.map((row, i) => i === idx ? { ...row, [key]: val } : row))

  const remove = (idx: number, id: string) => {
    if (id && equipment.find(e => e.id === id)) {
      startTransition(async () => { await deleteEquipmentRow(id, reportId, projectId); router.refresh() })
    }
    setRows(r => r.filter((_, i) => i !== idx))
  }

  const save = () => {
    startTransition(async () => {
      const res = await upsertEquipment(reportId, projectId, rows.filter(r => r.equipment_name))
      if (!res.error) { setSaved(true); setTimeout(() => setSaved(false), 2000); router.refresh() }
    })
  }

  const totalHours = rows.reduce((s, r) => s + (r.hours_used || 0), 0)

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Wrench size={16} className="text-amber-500" />
          <h3 className="font-semibold text-slate-800">Equipment</h3>
          <span className="text-xs text-slate-400 ml-1">Total hours: {totalHours.toFixed(1)}</span>
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
          {readonly ? 'No equipment recorded.' : 'Click "Add Row" to log equipment on site.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left text-xs text-slate-500 px-4 py-2 font-medium">Equipment</th>
                <th className="text-left text-xs text-slate-500 px-4 py-2 font-medium">Type</th>
                <th className="text-right text-xs text-slate-500 px-4 py-2 font-medium">Qty</th>
                <th className="text-right text-xs text-slate-500 px-4 py-2 font-medium">Hours Used</th>
                <th className="text-right text-xs text-slate-500 px-4 py-2 font-medium">Idle hrs</th>
                <th className="text-left text-xs text-slate-500 px-4 py-2 font-medium">Operator</th>
                {!readonly && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">
                    {readonly ? <span>{row.equipment_name}</span> : (
                      <input value={row.equipment_name} onChange={e => update(idx, 'equipment_name', e.target.value)} placeholder="e.g. Tower Crane TC-01"
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {readonly ? <span>{row.equipment_type ?? '—'}</span> : (
                      <select value={row.equipment_type ?? ''} onChange={e => update(idx, 'equipment_type', e.target.value || null)}
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400">
                        <option value="">—</option>
                        {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {readonly ? <span className="block text-right">{row.quantity}</span> : (
                      <input type="number" min="1" value={row.quantity} onChange={e => update(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-16 text-xs border border-slate-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-amber-400 ml-auto block" />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {readonly ? <span className="block text-right">{row.hours_used}</span> : (
                      <input type="number" min="0" step="0.5" value={row.hours_used} onChange={e => update(idx, 'hours_used', parseFloat(e.target.value) || 0)}
                        className="w-20 text-xs border border-slate-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-amber-400 ml-auto block" />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {readonly ? <span className="block text-right">{row.idle_hours}</span> : (
                      <input type="number" min="0" step="0.5" value={row.idle_hours} onChange={e => update(idx, 'idle_hours', parseFloat(e.target.value) || 0)}
                        className="w-20 text-xs border border-slate-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-amber-400 ml-auto block" />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {readonly ? <span>{row.operator_name ?? '—'}</span> : (
                      <input value={row.operator_name ?? ''} onChange={e => update(idx, 'operator_name', e.target.value || null)} placeholder="Name"
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400" />
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
