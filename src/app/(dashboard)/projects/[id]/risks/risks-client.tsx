'use client'

import { useState, useTransition } from 'react'
import { ProjectRisk } from '@/lib/types'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { createProjectRisk, deleteProjectRisk } from '@/app/actions/risks'
import { useRouter } from 'next/navigation'

interface Props {
  risks: ProjectRisk[]
  projectId: string
}

const PROB_LEVELS = ['low', 'medium', 'high']
const IMPACT_LEVELS = ['low', 'medium', 'high']

function scoreColor(score: number) {
  if (score >= 6) return 'bg-red-100 text-red-700 border-red-200'
  if (score >= 3) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-green-100 text-green-700 border-green-200'
}

function cellBg(prob: string, impact: string, risks: ProjectRisk[]) {
  const p = prob === 'high' ? 3 : prob === 'medium' ? 2 : 1
  const i = impact === 'high' ? 3 : impact === 'medium' ? 2 : 1
  const score = p * i
  const count = risks.filter(r => r.probability === prob && r.impact === impact).length
  const bg = score >= 6 ? 'bg-red-100 border-red-200' : score >= 3 ? 'bg-amber-100 border-amber-200' : 'bg-green-100 border-green-200'
  return { bg, count }
}

export function RisksClient({ risks, projectId }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const filtered = risks.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false
    return true
  })

  const total = risks.length
  const high = risks.filter(r => r.risk_score >= 6).length
  const open = risks.filter(r => r.status === 'open').length
  const mitigated = risks.filter(r => r.status === 'mitigated').length

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createProjectRisk(projectId, fd)
      if (result.error) { setError(result.error); return }
      setShowAdd(false)
      router.refresh()
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this risk?')) return
    await deleteProjectRisk(id, projectId)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Risks', value: total, color: 'text-slate-900' },
          { label: 'High Risks (≥6)', value: high, color: 'text-red-600' },
          { label: 'Open', value: open, color: 'text-amber-600' },
          { label: 'Mitigated', value: mitigated, color: 'text-green-600' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* 5x5 Risk Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Risk Matrix (Probability vs Impact)</h2>
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse w-full max-w-lg">
            <thead>
              <tr>
                <th className="px-2 py-1 text-slate-400 font-medium text-left w-20">Prob / Impact</th>
                {IMPACT_LEVELS.map(i => (
                  <th key={i} className="px-3 py-2 text-slate-600 font-semibold capitalize text-center">{i}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...PROB_LEVELS].reverse().map(prob => (
                <tr key={prob}>
                  <td className="px-2 py-2 text-slate-600 font-semibold capitalize">{prob}</td>
                  {IMPACT_LEVELS.map(impact => {
                    const { bg, count } = cellBg(prob, impact, risks)
                    return (
                      <td key={impact} className={`px-3 py-3 border ${bg} text-center font-bold text-sm`}>
                        {count > 0 ? <span className="w-7 h-7 rounded-full bg-white/70 inline-flex items-center justify-center">{count}</span> : <span className="text-slate-300">—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block"></span> Low (1-2)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 inline-block"></span> Medium (3-4)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block"></span> High (6-9)</span>
          </div>
        </div>
      </div>

      {/* Filters + Add */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="mitigated">Mitigated</option>
          <option value="closed">Closed</option>
          <option value="accepted">Accepted</option>
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          <option value="safety">Safety</option>
          <option value="financial">Financial</option>
          <option value="schedule">Schedule</option>
          <option value="technical">Technical</option>
          <option value="environmental">Environmental</option>
          <option value="general">General</option>
        </select>
        <div className="ml-auto">
          <Button onClick={() => { setShowAdd(true); setError('') }}>
            <Plus size={16} /> Add Risk
          </Button>
        </div>
      </div>

      {/* Risk Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Title</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Probability</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Impact</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Score</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Owner</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Mitigation</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">No risks found.</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900 max-w-xs">
                  <div>{r.title}</div>
                  {r.description && <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{r.description}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium capitalize">{r.category}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize border ${r.probability === 'high' ? 'bg-red-100 text-red-700 border-red-200' : r.probability === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-green-100 text-green-700 border-green-200'}`}>{r.probability}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize border ${r.impact === 'high' ? 'bg-red-100 text-red-700 border-red-200' : r.impact === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-green-100 text-green-700 border-green-200'}`}>{r.impact}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-lg text-sm font-bold border ${scoreColor(r.risk_score)}`}>{r.risk_score}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.owner ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${r.status === 'open' ? 'bg-red-100 text-red-700' : r.status === 'mitigated' ? 'bg-green-100 text-green-700' : r.status === 'accepted' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{r.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-[150px] truncate">{r.mitigation ?? '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(r.id)} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Risk" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input name="title" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea name="description" rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select name="category" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="general">General</option>
                <option value="safety">Safety</option>
                <option value="financial">Financial</option>
                <option value="schedule">Schedule</option>
                <option value="technical">Technical</option>
                <option value="environmental">Environmental</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select name="status" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="open">Open</option>
                <option value="mitigated">Mitigated</option>
                <option value="accepted">Accepted</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Probability</label>
              <select name="probability" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Impact</label>
              <select name="impact" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Owner</label>
              <input name="owner" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <input name="due_date" type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mitigation Plan</label>
            <textarea name="mitigation" rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Add Risk'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
