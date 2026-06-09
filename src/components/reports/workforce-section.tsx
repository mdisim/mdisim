'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SDRWorkforce, Contractor } from '@/lib/types'
import { upsertWorkforce, deleteWorkforceRow } from '@/app/actions/reports'
import { Plus, Trash2, Save, Loader2, Users } from 'lucide-react'

interface Props {
  reportId: string
  projectId: string
  workforce: SDRWorkforce[]
  contractors: Contractor[]
  readonly?: boolean
}

type Row = Omit<SDRWorkforce, 'created_at' | 'contractor'>

const TRADES = ['Mason', 'Carpenter', 'Steel Fixer', 'Electrician', 'Plumber', 'HVAC Tech', 'Painter', 'Labourer', 'Supervisor', 'Engineer', 'Surveyor', 'Other']

export function WorkforceSection({ reportId, projectId, workforce, contractors, readonly }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [rows, setRows] = useState<Row[]>(workforce.length ? workforce : [])
  const [saved, setSaved] = useState(false)

  const addRow = () => setRows(r => [...r, {
    id: crypto.randomUUID(),
    report_id: reportId,
    trade: '',
    contractor_id: null,
    planned_count: 0,
    actual_count: 0,
    overtime_hours: 0,
    notes: null,
  }])

  const update = (idx: number, key: keyof Row, val: string | number | null) =>
    setRows(r => r.map((row, i) => i === idx ? { ...row, [key]: val } : row))

  const remove = (idx: number, id: string) => {
    if (id && workforce.find(w => w.id === id)) {
      startTransition(async () => {
        await deleteWorkforceRow(id, reportId, projectId)
        router.refresh()
      })
    }
    setRows(r => r.filter((_, i) => i !== idx))
  }

  const save = () => {
    startTransition(async () => {
      const res = await upsertWorkforce(reportId, projectId, rows.filter(r => r.trade))
      if (!res.error) { setSaved(true); setTimeout(() => setSaved(false), 2000); router.refresh() }
    })
  }

  const totalPlanned = rows.reduce((s, r) => s + (r.planned_count || 0), 0)
  const totalActual = rows.reduce((s, r) => s + (r.actual_count || 0), 0)

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-amber-500" />
          <h3 className="font-semibold text-slate-800">Workforce</h3>
          <span className="text-xs text-slate-400 ml-1">Planned: {totalPlanned} · Actual: {totalActual}</span>
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
          {readonly ? 'No workforce recorded.' : 'No trades added yet. Click "Add Row" to record workforce.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left text-xs text-slate-500 px-4 py-2 font-medium">Trade</th>
                <th className="text-left text-xs text-slate-500 px-4 py-2 font-medium">Contractor</th>
                <th className="text-right text-xs text-slate-500 px-4 py-2 font-medium">Planned</th>
                <th className="text-right text-xs text-slate-500 px-4 py-2 font-medium">Actual</th>
                <th className="text-right text-xs text-slate-500 px-4 py-2 font-medium">O/T hrs</th>
                {!readonly && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2">
                    {readonly ? <span>{row.trade}</span> : (
                      <select value={row.trade} onChange={e => update(idx, 'trade', e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400">
                        <option value="">— Select —</option>
                        {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {readonly ? <span>{row.contractor_id ?? '—'}</span> : (
                      <select value={row.contractor_id ?? ''} onChange={e => update(idx, 'contractor_id', e.target.value || null)}
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400">
                        <option value="">— None —</option>
                        {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {readonly ? <span className="block text-right">{row.planned_count}</span> : (
                      <input type="number" min="0" value={row.planned_count} onChange={e => update(idx, 'planned_count', parseInt(e.target.value) || 0)}
                        className="w-20 text-xs border border-slate-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-amber-400 ml-auto block" />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {readonly ? <span className="block text-right">{row.actual_count}</span> : (
                      <input type="number" min="0" value={row.actual_count} onChange={e => update(idx, 'actual_count', parseInt(e.target.value) || 0)}
                        className="w-20 text-xs border border-slate-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-amber-400 ml-auto block" />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {readonly ? <span className="block text-right">{row.overtime_hours}</span> : (
                      <input type="number" min="0" step="0.5" value={row.overtime_hours} onChange={e => update(idx, 'overtime_hours', parseFloat(e.target.value) || 0)}
                        className="w-20 text-xs border border-slate-200 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-amber-400 ml-auto block" />
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
