'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Tender } from '@/lib/types'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Gavel, GitCompare, Search } from 'lucide-react'
import { createTender, deleteTender, advanceTenderStatus } from '@/app/actions/tenders'

interface Props {
  tenders: Tender[]
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
  awarded: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-500',
}

const NEXT_STATUS: Record<string, string[]> = {
  draft: ['submitted'],
  submitted: ['awarded', 'lost'],
  awarded: [],
  lost: [],
  withdrawn: [],
}

export function TendersClient({ tenders: initialTenders }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 5) next.add(id)
      return next
    })
  }

  function handleCompare() {
    if (selectedIds.size < 2) return
    router.push(`/tenders/compare?ids=${Array.from(selectedIds).join(',')}`)
  }

  const filtered = initialTenders.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.client_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const total = initialTenders.length
  const submitted = initialTenders.filter(t => t.status === 'submitted').length
  const awarded = initialTenders.filter(t => t.status === 'awarded').length
  const winRate = submitted + awarded > 0 ? Math.round((awarded / (submitted + awarded)) * 100) : 0

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createTender(fd)
      if (result.error) { setError(result.error); return }
      setShowAdd(false)
      router.refresh()
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this tender?')) return
    await deleteTender(id)
    router.refresh()
  }

  async function handleAdvance(id: string, status: string) {
    await advanceTenderStatus(id, status)
    router.refresh()
  }

  return (
    <div>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Total Tenders</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{total}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Submitted</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{submitted}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Awarded</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{awarded}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Win Rate</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{winRate}%</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tenders..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {selectedIds.size >= 2 && (
          <button
            onClick={handleCompare}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <GitCompare size={15} />
            Compare ({selectedIds.size})
          </button>
        )}
        <Button onClick={() => { setShowAdd(true); setError('') }}>
          <Plus size={16} />
          Add Tender
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 w-8"></th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Title</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Client</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Number</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Deadline</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Est. Value</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  {initialTenders.length === 0 ? 'No tenders yet. Click "Add Tender" to get started.' : 'No tenders match your search.'}
                </td>
              </tr>
            ) : (
              filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/tenders/${t.id}`} className="font-medium text-slate-900 hover:text-blue-600 transition-colors">
                      {t.title}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{t.client_name ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.tender_number ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {t.submission_deadline ? new Date(t.submission_deadline).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">${(t.estimated_value ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {(NEXT_STATUS[t.status] ?? []).map(s => (
                        <button
                          key={s}
                          onClick={() => handleAdvance(t.id, s)}
                          className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Tender" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input name="title" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client Name</label>
              <input name="client_name" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tender Number</label>
              <input name="tender_number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Issue Date</label>
              <input name="issue_date" type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Submission Deadline</label>
              <input name="submission_deadline" type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Value</label>
              <input name="estimated_value" type="number" step="0.01" min="0" defaultValue="0" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select name="status" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="awarded">Awarded</option>
                <option value="lost">Lost</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea name="description" rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea name="notes" rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Create Tender'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export { Gavel }
