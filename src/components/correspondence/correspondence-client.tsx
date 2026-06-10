'use client'

import { useState } from 'react'
import { createCorrespondence, deleteCorrespondence } from '@/app/actions/correspondence'
import { ProjectCorrespondence } from '@/lib/types'

const categoryColors: Record<string, string> = {
  instruction: 'bg-red-100 text-red-700',
  rfi: 'bg-blue-100 text-blue-700',
  claim: 'bg-orange-100 text-orange-700',
  notice: 'bg-yellow-100 text-yellow-700',
  approval: 'bg-green-100 text-green-700',
  general: 'bg-gray-100 text-gray-700',
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  replied: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
  action_required: 'bg-red-100 text-red-700',
}

interface CorrespondenceClientProps {
  items: ProjectCorrespondence[]
  projectId: string
}

export function CorrespondenceClient({ items, projectId }: CorrespondenceClientProps) {
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterDir, setFilterDir] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [toast, setToast] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const filtered = items.filter(i => {
    if (filterDir && i.direction !== filterDir) return false
    if (filterCat && i.category !== filterCat) return false
    if (filterStatus && i.status !== filterStatus) return false
    return true
  })

  const total = items.length
  const incoming = items.filter(i => i.direction === 'incoming').length
  const outgoing = items.filter(i => i.direction === 'outgoing').length
  const actionRequired = items.filter(i => i.status === 'action_required').length
  const overdue = items.filter(i => i.due_date && i.due_date < today && i.status !== 'closed').length

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    const result = await createCorrespondence(projectId, fd)
    setSaving(false)
    if ('error' in result) {
      showToast('Error: ' + result.error)
    } else {
      setShowModal(false)
      showToast('Correspondence added')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item?')) return
    const result = await deleteCorrespondence(id, projectId)
    if ('error' in result) showToast('Error: ' + result.error)
    else showToast('Deleted')
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500'

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm">{toast}</div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: total },
          { label: 'Incoming', value: incoming },
          { label: 'Outgoing', value: outgoing },
          { label: 'Action Required', value: actionRequired, warn: actionRequired > 0 },
          { label: 'Overdue', value: overdue, warn: overdue > 0 },
        ].map(k => (
          <div key={k.label} className={`bg-white border rounded-xl p-4 ${k.warn ? 'border-red-200' : 'border-slate-200'}`}>
            <p className="text-xs text-slate-400 uppercase tracking-wide">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.warn ? 'text-red-600' : 'text-slate-900'}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + Add */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterDir} onChange={e => setFilterDir(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">All Directions</option>
          <option value="incoming">Incoming</option>
          <option value="outgoing">Outgoing</option>
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">All Categories</option>
          {['instruction', 'rfi', 'claim', 'notice', 'approval', 'general'].map(c => (
            <option key={c} value={c}>{c.toUpperCase()}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">All Statuses</option>
          {['open', 'replied', 'closed', 'action_required'].map(s => (
            <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
          ))}
        </select>
        <div className="ml-auto">
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold rounded-lg"
          >
            + Add Correspondence
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ref</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Direction</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Correspondent</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Due</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-sm">No correspondence records found</td>
                </tr>
              )}
              {filtered.map(item => {
                const isOverdue = item.due_date && item.due_date < today && item.status !== 'closed'
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.reference_number}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">{item.subject}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.direction === 'incoming' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.direction === 'incoming' ? 'IN' : 'OUT'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.correspondent ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{item.letter_date ? new Date(item.letter_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${categoryColors[item.category] ?? 'bg-gray-100 text-gray-600'}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[item.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                      {item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600 text-xs">Del</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-slate-800">Add Correspondence</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Reference Number *</label>
                  <input name="reference_number" required className={inputClass} placeholder="CORR-001" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Direction</label>
                  <select name="direction" className={inputClass}>
                    <option value="outgoing">Outgoing</option>
                    <option value="incoming">Incoming</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Subject *</label>
                <input name="subject" required className={inputClass} placeholder="Subject of the correspondence" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Correspondent</label>
                  <input name="correspondent" className={inputClass} placeholder="Company or person" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
                  <select name="category" className={inputClass}>
                    {['general', 'instruction', 'rfi', 'claim', 'notice', 'approval'].map(c => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Letter Date</label>
                  <input name="letter_date" type="date" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Received Date</label>
                  <input name="received_date" type="date" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
                  <select name="status" className={inputClass}>
                    {['open', 'replied', 'action_required', 'closed'].map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Due Date</label>
                  <input name="due_date" type="date" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Summary</label>
                <textarea name="summary" rows={3} className={inputClass} placeholder="Brief summary..." />
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Action Required</label>
                <textarea name="action_required" rows={2} className={inputClass} placeholder="Actions needed..." />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white text-sm font-semibold rounded-lg">
                  {saving ? 'Saving...' : 'Add Correspondence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
