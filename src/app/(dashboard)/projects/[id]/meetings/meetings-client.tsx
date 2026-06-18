'use client'

import { useState, useTransition } from 'react'
import { MeetingMinutes } from '@/lib/types'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { createMeetingMinutes, deleteMeetingMinutes } from '@/app/actions/meetings'
import { useRouter } from 'next/navigation'

interface Props {
  meetings: MeetingMinutes[]
  projectId: string
}

function typeBadge(type: string) {
  const map: Record<string, string> = {
    progress: 'bg-blue-100 text-blue-700',
    design: 'bg-purple-100 text-purple-700',
    safety: 'bg-red-100 text-red-700',
    coordination: 'bg-amber-100 text-amber-700',
    other: 'bg-slate-100 text-slate-600',
  }
  return map[type] ?? 'bg-slate-100 text-slate-600'
}

function countAttendees(attendees: string | null): number {
  if (!attendees || attendees.trim() === '') return 0
  return attendees.split(',').length
}

function groupByMonth(meetings: MeetingMinutes[]): [string, MeetingMinutes[]][] {
  const map = new Map<string, MeetingMinutes[]>()
  for (const m of meetings) {
    const d = new Date(m.meeting_date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(m)
  }
  return Array.from(map.entries())
}

function monthLabel(key: string) {
  const [year, month] = key.split('-')
  return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function MeetingsClient({ meetings, projectId }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const today = new Date()
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000).toISOString().split('T')[0]

  const total = meetings.length
  const thisMonthCount = meetings.filter(m => m.meeting_date.startsWith(thisMonth)).length
  const actionItemsPending = meetings.filter(m => m.action_items && m.action_items.trim() && m.meeting_date >= thirtyDaysAgo).length

  const grouped = groupByMonth(meetings)

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createMeetingMinutes(projectId, fd)
      if (result.error) { setError(result.error); return }
      setShowAdd(false)
      router.refresh()
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this meeting?')) return
    await deleteMeetingMinutes(id, projectId)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Meetings', value: total, color: 'text-slate-900' },
          { label: 'This Month', value: thisMonthCount, color: 'text-blue-600' },
          { label: 'Action Items (30d)', value: actionItemsPending, color: 'text-amber-600' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <Button onClick={() => { setShowAdd(true); setError('') }}>
          <Plus size={16} /> Add Meeting
        </Button>
      </div>

      {/* Grouped list */}
      {grouped.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
          No meetings recorded yet.
        </div>
      ) : grouped.map(([monthKey, monthMeetings]) => (
        <div key={monthKey}>
          <h3 className="text-sm font-semibold text-slate-500 mb-3">{monthLabel(monthKey)}</h3>
          <div className="space-y-3">
            {monthMeetings.map(m => (
              <div key={m.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-slate-900">{m.meeting_date}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${typeBadge(m.meeting_type)}`}>{m.meeting_type}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{m.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1.5 text-xs text-slate-500">
                      {m.location && <span>Location: {m.location}</span>}
                      {m.chaired_by && <span>Chaired by: {m.chaired_by}</span>}
                      <span>{countAttendees(m.attendees)} attendee{countAttendees(m.attendees) !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 hover:bg-slate-50 flex items-center gap-1"
                    >
                      {expandedId === m.id ? <><ChevronUp size={12} /> Hide</> : <><ChevronDown size={12} /> View</>}
                    </button>
                    <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {expandedId === m.id && (
                  <div className="border-t border-slate-100 px-5 py-4 space-y-4 bg-slate-50">
                    {m.attendees && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Attendees</h4>
                        <p className="text-sm text-slate-700">{m.attendees}</p>
                      </div>
                    )}
                    {m.agenda && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Agenda</h4>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{m.agenda}</p>
                      </div>
                    )}
                    {m.minutes && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Minutes / Decisions</h4>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{m.minutes}</p>
                      </div>
                    )}
                    {m.action_items && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Action Items</h4>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{m.action_items}</p>
                      </div>
                    )}
                    {m.next_meeting_date && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Next Meeting</h4>
                        <p className="text-sm text-slate-700">{m.next_meeting_date}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Meeting Minutes" size="xl">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Date *</label>
              <input name="meeting_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Type</label>
              <select name="meeting_type" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="progress">Progress</option>
                <option value="design">Design</option>
                <option value="safety">Safety</option>
                <option value="coordination">Coordination</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input name="location" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Chaired By</label>
              <input name="chaired_by" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Attendees (comma-separated)</label>
            <input name="attendees" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="John Smith, Jane Doe, ..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Agenda</label>
            <textarea name="agenda" rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Minutes / Decisions</label>
            <textarea name="minutes" rows={4} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Action Items</label>
            <textarea name="action_items" rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="1. Item one&#10;2. Item two" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Next Meeting Date</label>
              <input name="next_meeting_date" type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select name="status" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save Meeting'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
