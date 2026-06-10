'use client'

import { useState } from 'react'
import { ProjectPhase, ProjectMilestone } from '@/lib/types'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Plus, GitBranch, Milestone, Trash2, Pencil, ChevronDown, ChevronUp } from 'lucide-react'
import { createPhase, updatePhase, deletePhase, createMilestone, deleteMilestone } from '@/app/actions/phases'
import { useRouter } from 'next/navigation'

const PHASE_STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  on_hold: 'bg-amber-100 text-amber-700',
}

const MILESTONE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  completed: 'bg-green-100 text-green-700',
  missed: 'bg-red-100 text-red-600',
}

const inputClass =
  'w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
const labelClass = 'block text-xs text-slate-500 uppercase tracking-wide mb-1.5'

function PhaseForm({
  projectId,
  phase,
  onSuccess,
  onCancel,
}: {
  projectId: string
  phase?: ProjectPhase
  onSuccess: () => void
  onCancel: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = phase
      ? await updatePhase(phase.id, projectId, formData)
      : await createPhase(projectId, formData)
    if ('error' in result) {
      setError(result.error ?? 'An error occurred')
    } else {
      router.refresh()
      onSuccess()
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Phase Name *</label>
        <input name="name" required defaultValue={phase?.name ?? ''} placeholder="e.g. Foundation" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Description</label>
        <textarea name="description" defaultValue={phase?.description ?? ''} rows={2} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Start Date</label>
          <input name="start_date" type="date" defaultValue={phase?.start_date ?? ''} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>End Date</label>
          <input name="end_date" type="date" defaultValue={phase?.end_date ?? ''} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Progress (%)</label>
          <input name="progress_percent" type="number" min="0" max="100" defaultValue={phase?.progress_percent ?? 0} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select name="status" defaultValue={phase?.status ?? 'not_started'} className={inputClass}>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>
      </div>
      <input type="hidden" name="sort_order" value={phase?.sort_order ?? 0} />
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : phase ? 'Save Changes' : 'Add Phase'}</Button>
      </div>
    </form>
  )
}

function MilestoneForm({
  projectId,
  phaseId,
  onSuccess,
  onCancel,
}: {
  projectId: string
  phaseId: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('phase_id', phaseId)
    const result = await createMilestone(projectId, formData)
    if ('error' in result) {
      setError(result.error ?? 'An error occurred')
    } else {
      router.refresh()
      onSuccess()
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Milestone Name *</label>
        <input name="name" required placeholder="e.g. Foundation Inspection Passed" className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Due Date</label>
          <input name="due_date" type="date" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select name="status" defaultValue="pending" className={inputClass}>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="missed">Missed</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Notes</label>
        <textarea name="notes" rows={2} className={inputClass} />
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add Milestone'}</Button>
      </div>
    </form>
  )
}

interface PhasesClientProps {
  phases: ProjectPhase[]
  milestones: ProjectMilestone[]
  projectId: string
}

export function PhasesClient({ phases, milestones, projectId }: PhasesClientProps) {
  const [showAddPhase, setShowAddPhase] = useState(false)
  const [editPhase, setEditPhase] = useState<ProjectPhase | null>(null)
  const [addMilestonePhaseId, setAddMilestonePhaseId] = useState<string | null>(null)
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(phases.map((p) => p.id)))
  const router = useRouter()

  const handleDeletePhase = async (id: string) => {
    if (!confirm('Delete this phase and its milestones?')) return
    await deletePhase(id, projectId)
    router.refresh()
  }

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm('Delete this milestone?')) return
    await deleteMilestone(id, projectId)
    router.refresh()
  }

  const togglePhase = (id: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getMilestonesForPhase = (phaseId: string) =>
    milestones.filter((m) => m.phase_id === phaseId)

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setShowAddPhase(true)}>
          <Plus size={16} />
          Add Phase
        </Button>
      </div>

      {phases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <GitBranch size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">No phases yet</p>
          <p className="text-sm mt-1">Break your project into phases to track progress</p>
          <button
            onClick={() => setShowAddPhase(true)}
            className="mt-4 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-400 transition-colors"
          >
            Add Phase
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Timeline */}
          <div className="relative">
            {phases.map((phase, index) => {
              const phaseMilestones = getMilestonesForPhase(phase.id)
              const isExpanded = expandedPhases.has(phase.id)
              return (
                <div key={phase.id} className="relative flex gap-4">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-4 h-4 rounded-full border-2 mt-5 shrink-0 z-10 ${
                        phase.status === 'completed'
                          ? 'bg-green-500 border-green-500'
                          : phase.status === 'in_progress'
                          ? 'bg-amber-500 border-amber-500'
                          : 'bg-white border-slate-300'
                      }`}
                    />
                    {index < phases.length - 1 && (
                      <div className="w-0.5 flex-1 bg-slate-200 min-h-4 mt-1" />
                    )}
                  </div>

                  {/* Phase card */}
                  <div className="flex-1 mb-4">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-slate-900">{phase.name}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PHASE_STATUS_COLORS[phase.status]}`}>
                                {phase.status.replace('_', ' ')}
                              </span>
                            </div>
                            {phase.description && (
                              <p className="text-sm text-slate-500 mt-1">{phase.description}</p>
                            )}
                            {(phase.start_date || phase.end_date) && (
                              <p className="text-xs text-slate-400 mt-1">
                                {phase.start_date && new Date(phase.start_date).toLocaleDateString()}
                                {phase.start_date && phase.end_date && ' – '}
                                {phase.end_date && new Date(phase.end_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-3 shrink-0">
                            <button
                              onClick={() => setEditPhase(phase)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDeletePhase(phase.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                            <button
                              onClick={() => togglePhase(phase.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-400">Progress</span>
                            <span className="text-xs font-medium text-slate-600">{phase.progress_percent}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                phase.progress_percent === 100
                                  ? 'bg-green-500'
                                  : phase.progress_percent >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                              }`}
                              style={{ width: `${phase.progress_percent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Milestones */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                              <Milestone size={12} />
                              Milestones ({phaseMilestones.length})
                            </p>
                            <button
                              onClick={() => setAddMilestonePhaseId(phase.id)}
                              className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                            >
                              <Plus size={12} /> Add
                            </button>
                          </div>
                          {phaseMilestones.length === 0 ? (
                            <p className="text-xs text-slate-400 py-2">No milestones yet</p>
                          ) : (
                            <div className="space-y-2">
                              {phaseMilestones.map((ms) => (
                                <div key={ms.id} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-2 h-2 rounded-full ${
                                        ms.status === 'completed'
                                          ? 'bg-green-500'
                                          : ms.status === 'missed'
                                          ? 'bg-red-500'
                                          : 'bg-slate-300'
                                      }`}
                                    />
                                    <span className="text-sm text-slate-800">{ms.name}</span>
                                    {ms.due_date && (
                                      <span className="text-xs text-slate-400">
                                        {new Date(ms.due_date).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MILESTONE_STATUS_COLORS[ms.status]}`}>
                                      {ms.status}
                                    </span>
                                    <button
                                      onClick={() => handleDeleteMilestone(ms.id)}
                                      className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add Phase Modal */}
      <Modal isOpen={showAddPhase} onClose={() => setShowAddPhase(false)} title="Add Phase" size="lg">
        <PhaseForm projectId={projectId} onSuccess={() => setShowAddPhase(false)} onCancel={() => setShowAddPhase(false)} />
      </Modal>

      {/* Edit Phase Modal */}
      <Modal isOpen={!!editPhase} onClose={() => setEditPhase(null)} title="Edit Phase" size="lg">
        {editPhase && (
          <PhaseForm
            projectId={projectId}
            phase={editPhase}
            onSuccess={() => setEditPhase(null)}
            onCancel={() => setEditPhase(null)}
          />
        )}
      </Modal>

      {/* Add Milestone Modal */}
      <Modal isOpen={!!addMilestonePhaseId} onClose={() => setAddMilestonePhaseId(null)} title="Add Milestone">
        {addMilestonePhaseId && (
          <MilestoneForm
            projectId={projectId}
            phaseId={addMilestonePhaseId}
            onSuccess={() => setAddMilestonePhaseId(null)}
            onCancel={() => setAddMilestonePhaseId(null)}
          />
        )}
      </Modal>
    </>
  )
}
