'use client'

import { useState, useTransition } from 'react'
import { ProjectIssue } from '@/lib/types'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, ChevronRight } from 'lucide-react'
import { createProjectIssue, deleteProjectIssue, advanceIssueStatus } from '@/app/actions/issues'
import { useRouter } from 'next/navigation'

interface Props {
  issues: ProjectIssue[]
  projectId: string
}

function priorityBadge(priority: string) {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-700 border-red-200'
    case 'high': return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    default: return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'open': return 'bg-red-100 text-red-700'
    case 'in_progress': return 'bg-amber-100 text-amber-700'
    case 'resolved': return 'bg-green-100 text-green-700'
    default: return 'bg-slate-100 text-slate-600'
  }
}

const nextStatus: Record<string, string> = {
  open: 'in_progress',
  in_progress: 'resolved',
  resolved: 'closed',
}

export function IssuesClient({ issues, projectId }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const today = new Date().toISOString().split('T')[0]

  const filtered = issues.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    if (priorityFilter !== 'all' && i.priority !== priorityFilter) return false
    return true
  })

  const total = issues.length
  const open = issues.filter(i => i.status === 'open').length
  const inProgress = issues.filter(i => i.status === 'in_progress').length
  const criticalOpen = issues.filter(i => i.priority === 'critical' && i.status !== 'closed' && i.status !== 'resolved').length

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createProjectIssue(projectId, fd)
      if (result.error) { setError(result.error); return }
      setShowAdd(false)
      router.refresh()
    })
  }

  async function handleAdvance(id: string, currentStatus: string) {
    startTransition(async () => {
      await advanceIssueStatus(id, projectId, currentStatus)
      router.refresh()
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this issue?')) return
    await deleteProjectIssue(id, projectId)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: total, color: 'text-slate-900' },
          { label: 'Open', value: open, color: 'text-red-600' },
          { label: 'In Progress', value: inProgress, color: 'text-amber-600' },
          { label: 'Critical Open', value: criticalOpen, color: 'text-red-700' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
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
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <div className="ml-auto">
          <Button onClick={() => { setShowAdd(true); setError('') }}>
            <Plus size={16} /> Add Issue
          </Button>
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">#</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Title</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Priority</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Assigned To</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Due Date</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No issues found.</td></tr>
            ) : filtered.map(issue => {
              const isOverdue = issue.due_date && issue.due_date < today && issue.status !== 'resolved' && issue.status !== 'closed'
              return (
                <tr key={issue.id} className={isOverdue ? 'bg-red-50' : 'hover:bg-slate-50'}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{issue.issue_number}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 max-w-xs">
                    <div>{issue.title}</div>
                    {issue.description && <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{issue.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium capitalize">{issue.category}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize border ${priorityBadge(issue.priority)}`}>{issue.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(issue.status)}`}>{issue.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{issue.assigned_to ?? '—'}</td>
                  <td className={`px-4 py-3 text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>{issue.due_date ?? '—'}</td>
                  <td className="px-4 py-3 flex items-center gap-1">
                    {nextStatus[issue.status] && (
                      <button
                        onClick={() => handleAdvance(issue.id, issue.status)}
                        disabled={isPending}
                        className="px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center gap-0.5"
                      >
                        {nextStatus[issue.status].replace('_', ' ')} <ChevronRight size={10} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(issue.id)} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Issue" size="lg">
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
                <option value="quality">Quality</option>
                <option value="rfi">RFI</option>
                <option value="instruction">Instruction</option>
                <option value="design">Design</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select name="priority" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Raised By</label>
              <input name="raised_by" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To</label>
              <input name="assigned_to" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
            <input name="due_date" type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Add Issue'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
