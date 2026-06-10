'use client'

import { useState, useTransition } from 'react'
import { ConcretePour, ReinforcementRecord } from '@/lib/types'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { createConcretePour, deleteConcretePour, createReinforcementRecord, deleteReinforcementRecord } from '@/app/actions/concrete'
import { useRouter } from 'next/navigation'

interface Props {
  pours: ConcretePour[]
  rebarRecords: ReinforcementRecord[]
  projectId: string
}

type Tab = 'concrete' | 'reinforcement'

export function ConcreteClient({ pours, rebarRecords, projectId }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('concrete')
  const [showAddPour, setShowAddPour] = useState(false)
  const [showAddRebar, setShowAddRebar] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const totalVolume = pours.reduce((s, p) => s + p.volume_m3, 0)
  const totalCubes = pours.reduce((s, p) => s + p.test_cubes, 0)
  const totalKg = rebarRecords.reduce((s, r) => s + (r.quantity_kg ?? 0), 0)
  const totalTonnes = totalKg / 1000

  async function handleAddPour(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createConcretePour(projectId, fd)
      if (result.error) { setError(result.error); return }
      setShowAddPour(false)
      router.refresh()
    })
  }

  async function handleDeletePour(id: string) {
    if (!confirm('Delete this pour record?')) return
    await deleteConcretePour(id, projectId)
    router.refresh()
  }

  async function handleAddRebar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createReinforcementRecord(projectId, fd)
      if (result.error) { setError(result.error); return }
      setShowAddRebar(false)
      router.refresh()
    })
  }

  async function handleDeleteRebar(id: string) {
    if (!confirm('Delete this reinforcement record?')) return
    await deleteReinforcementRecord(id, projectId)
    router.refresh()
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total Pours</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{pours.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total Volume</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalVolume.toFixed(2)} m³</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Test Cubes</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalCubes}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total Rebar</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalTonnes.toFixed(3)} t</p>
          <p className="text-xs text-slate-400">{totalKg.toFixed(0)} kg</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-4">
        <button
          onClick={() => setTab('concrete')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'concrete' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Concrete Pours ({pours.length})
        </button>
        <button
          onClick={() => setTab('reinforcement')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'reinforcement' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Reinforcement ({rebarRecords.length})
        </button>
      </div>

      {tab === 'concrete' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setShowAddPour(true); setError('') }}>
              <Plus size={16} />
              Log Pour
            </Button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Element</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Location</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Mix</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Volume (m³)</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">MPa</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Slump (mm)</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Cubes</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Supplier</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pours.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">No concrete pours logged yet.</td></tr>
                ) : (
                  pours.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{p.pour_date}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{p.element_type}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{p.location ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{p.mix_design ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold">{p.volume_m3.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">{p.strength_mpa ?? '—'}</td>
                      <td className="px-4 py-3 text-right">{p.slump_mm ?? '—'}</td>
                      <td className="px-4 py-3 text-right">{p.test_cubes}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{p.supplier ?? '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeletePour(p.id)} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'reinforcement' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setShowAddRebar(true); setError('') }}>
              <Plus size={16} />
              Log Reinforcement
            </Button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Element</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Location</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Dia (mm)</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Grade</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Qty (kg)</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Tonnes</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Supplier</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Heat #</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rebarRecords.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">No reinforcement records yet.</td></tr>
                ) : (
                  rebarRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{r.record_date}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{r.element_type}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.location ?? '—'}</td>
                      <td className="px-4 py-3 text-right">{r.bar_diameter_mm ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.steel_grade ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold">{r.quantity_kg?.toFixed(2) ?? '—'}</td>
                      <td className="px-4 py-3 text-right">{r.quantity_tonnes?.toFixed(3) ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.supplier ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{r.heat_number ?? '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteRebar(r.id)} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Pour Modal */}
      <Modal isOpen={showAddPour} onClose={() => setShowAddPour(false)} title="Log Concrete Pour" size="lg">
        <form onSubmit={handleAddPour} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pour Date *</label>
              <input name="pour_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Element Type *</label>
              <input name="element_type" required placeholder="e.g. Foundation, Column, Slab" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input name="location" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mix Design</label>
              <input name="mix_design" placeholder="e.g. C25/30" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Volume (m³) *</label>
              <input name="volume_m3" type="number" step="0.01" min="0" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Strength (MPa)</label>
              <input name="strength_mpa" type="number" min="0" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Slump (mm)</label>
              <input name="slump_mm" type="number" min="0" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Temp (°C)</label>
              <input name="temp_celsius" type="number" step="0.1" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Test Cubes</label>
              <input name="test_cubes" type="number" min="0" defaultValue="0" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
              <input name="supplier" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Batch Numbers</label>
            <input name="batch_numbers" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea name="notes" rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAddPour(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Log Pour'}</Button>
          </div>
        </form>
      </Modal>

      {/* Add Rebar Modal */}
      <Modal isOpen={showAddRebar} onClose={() => setShowAddRebar(false)} title="Log Reinforcement" size="lg">
        <form onSubmit={handleAddRebar} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Record Date *</label>
              <input name="record_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Element Type *</label>
              <input name="element_type" required placeholder="e.g. Column, Beam, Slab" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input name="location" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bar Diameter (mm)</label>
              <input name="bar_diameter_mm" type="number" min="0" placeholder="e.g. 16" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Steel Grade</label>
              <input name="steel_grade" placeholder="e.g. B500B" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity (kg)</label>
              <input name="quantity_kg" type="number" step="0.01" min="0" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
              <input name="supplier" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Heat Number</label>
            <input name="heat_number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea name="notes" rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAddRebar(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Log Reinforcement'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
