'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SDRIssue } from '@/lib/types'
import { createIssue, updateIssueStatus, deleteIssue } from '@/app/actions/reports'
import { SeverityBadge } from './report-status-badge'
import { Plus, Trash2, AlertTriangle, ChevronDown } from 'lucide-react'
import { Modal } from '@/components/ui/modal'

interface Props {
  reportId: string
  projectId: string
  issues: SDRIssue[]
  readonly?: boolean
}

const ISSUE_TYPES = ['safety', 'quality', 'delay', 'rfi', 'instruction', 'other']
const SEVERITIES = ['low', 'medium', 'high', 'critical']
const ISSUE_STATUSES = ['open', 'in_progress', 'resolved', 'closed']

export function IssuesSection({ reportId, projectId, issues, readonly }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [expanding, setExpanding] = useState<string | null>(null)
  const [form, setForm] = useState({
    issue_type: '', description: '', severity: 'medium', raised_by: '',
  })

  const handleCreate = () => {
    if (!form.description) return
    startTransition(async () => {
      await createIssue(reportId, projectId, {
        issue_type: form.issue_type || null,
        description: form.description,
        severity: form.severity,
        raised_by: form.raised_by || null,
      })
      setShowAdd(false)
      setForm({ issue_type: '', description: '', severity: 'medium', raised_by: '' })
      router.refresh()
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this issue?')) return
    startTransition(async () => { await deleteIssue(id, reportId, projectId); router.refresh() })
  }

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => { await updateIssueStatus(id, reportId, projectId, { status }); router.refresh() })
  }

  const openCount = issues.filter(i => i.status === 'open' || i.status === 'in_progress').length

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          <h3 className="font-semibold text-slate-800">Issues & Observations</h3>
          {openCount > 0 && (
            <span className="bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">{openCount} open</span>
          )}
        </div>
        {!readonly && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-amber-50 hover:border-amber-300 text-slate-600 transition-colors">
            <Plus size={12} /> Log Issue
          </button>
        )}
      </div>

      {issues.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-sm">
          {readonly ? 'No issues recorded.' : 'No issues logged today.'}
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {issues.map(issue => (
            <div key={issue.id} className="px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <SeverityBadge severity={issue.severity} />
                    {issue.issue_type && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{issue.issue_type}</span>
                    )}
                    {issue.raised_by && (
                      <span className="text-xs text-slate-400">Raised by: {issue.raised_by}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-800">{issue.description}</p>
                  {issue.resolution_notes && (
                    <p className="text-xs text-slate-400 mt-1">Resolution: {issue.resolution_notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!readonly ? (
                    <div className="relative">
                      <select
                        value={issue.status}
                        onChange={e => handleStatusChange(issue.id, e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none appearance-none pr-6"
                      >
                        {ISSUE_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{issue.status.replace('_', ' ')}</span>
                  )}
                  {!readonly && (
                    <button onClick={() => handleDelete(issue.id)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Log Issue / Observation" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Issue Type</label>
              <select value={form.issue_type} onChange={e => setForm(f => ({ ...f, issue_type: e.target.value }))}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option value="">— Select —</option>
                {ISSUE_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Severity</label>
              <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                {SEVERITIES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Description *</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} placeholder="Describe the issue or observation..."
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Raised By</label>
            <input value={form.raised_by} onChange={e => setForm(f => ({ ...f, raised_by: e.target.value }))}
              placeholder="Name / role"
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleCreate} disabled={!form.description || isPending}
              className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors">
              Log Issue
            </button>
            <button onClick={() => setShowAdd(false)}
              className="px-4 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
