import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BarChart2 } from 'lucide-react'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-slate-300',
  in_progress: 'bg-amber-400',
  completed: 'bg-green-500',
  on_hold: 'bg-red-400',
}

export default async function GanttPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: phases }, { data: milestones }] = await Promise.all([
    supabase.from('projects').select('id, name, start_date, end_date').eq('id', id).single(),
    supabase.from('project_phases').select('*').eq('project_id', id).order('sort_order'),
    supabase.from('project_milestones').select('*').eq('project_id', id).order('due_date'),
  ])

  if (!project) notFound()

  const phasesWithDates = (phases ?? []).filter(p => p.start_date && p.end_date)
  const milestonesWithDates = (milestones ?? []).filter(m => m.due_date)

  const hasDates = phasesWithDates.length > 0

  // Compute chart range
  let chartStart = new Date()
  let chartEnd = addDays(new Date(), 90)

  if (hasDates) {
    const allDates = [
      ...phasesWithDates.map(p => new Date(p.start_date!)),
      ...phasesWithDates.map(p => new Date(p.end_date!)),
      ...milestonesWithDates.map(m => new Date(m.due_date!)),
    ]
    chartStart = new Date(Math.min(...allDates.map(d => d.getTime())))
    chartEnd = new Date(Math.max(...allDates.map(d => d.getTime())))
    // Add some padding
    chartStart = addDays(chartStart, -7)
    chartEnd = addDays(chartEnd, 14)
  }

  const totalDays = Math.max(diffDays(chartStart, chartEnd), 1)

  // Build month labels
  const months: { label: string; left: number; width: number }[] = []
  const cursor = new Date(chartStart)
  cursor.setDate(1)
  while (cursor <= chartEnd) {
    const monthStart = cursor < chartStart ? chartStart : new Date(cursor)
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    const monthEnd = nextMonth > chartEnd ? chartEnd : nextMonth
    const left = (diffDays(chartStart, monthStart) / totalDays) * 100
    const width = (diffDays(monthStart, monthEnd) / totalDays) * 100
    months.push({
      label: cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      left,
      width,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15} /> Back to {project.name}
        </Link>
        <div className="flex items-center gap-3">
          <BarChart2 size={22} className="text-amber-600" />
          <h1 className="text-2xl font-bold text-slate-900">Gantt Chart</h1>
        </div>
        <p className="text-slate-500 text-sm mt-1">{project.name}</p>
      </div>

      {!hasDates ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white border border-slate-200 rounded-xl">
          <BarChart2 size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">Set phase dates to view Gantt chart</p>
          <p className="text-sm mt-1">Go to Phases &amp; Milestones to add start and end dates to your phases.</p>
          <Link href={`/projects/${id}/phases`} className="mt-4 text-sm text-amber-600 hover:underline">
            Go to Phases &amp; Milestones →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
          {/* Legend */}
          <div className="flex items-center gap-4 mb-6 text-xs text-slate-500">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5">
                <span className={`inline-block w-3 h-3 rounded-sm ${color}`} />
                <span>{status.replace('_', ' ')}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rotate-45 bg-purple-600" />
              <span>milestone</span>
            </div>
          </div>

          <div className="min-w-[600px]">
            {/* Month header */}
            <div className="flex mb-2">
              <div className="w-48 shrink-0" />
              <div className="flex-1 relative h-6">
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="absolute top-0 text-xs text-slate-500 font-medium border-l border-slate-200 pl-1"
                    style={{ left: `${m.left}%`, width: `${m.width}%` }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Phase rows */}
            <div className="space-y-2">
              {(phases ?? []).map(phase => {
                const hasBar = phase.start_date && phase.end_date
                const barLeft = hasBar
                  ? (diffDays(chartStart, new Date(phase.start_date!)) / totalDays) * 100
                  : 0
                const barWidth = hasBar
                  ? (diffDays(new Date(phase.start_date!), new Date(phase.end_date!)) / totalDays) * 100
                  : 0
                const colorClass = STATUS_COLORS[phase.status] ?? 'bg-slate-300'
                const phaseMilestones = milestonesWithDates.filter(m => m.phase_id === phase.id)

                return (
                  <div key={phase.id} className="flex items-center gap-2">
                    <div className="w-48 shrink-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{phase.name}</p>
                      <p className="text-xs text-slate-400">{phase.progress_percent}% complete</p>
                    </div>
                    <div className="flex-1 relative h-8 bg-slate-50 rounded border border-slate-100">
                      {hasBar && (
                        <div
                          className={`absolute top-1 h-6 ${colorClass} rounded opacity-80 flex items-center px-2`}
                          style={{
                            left: `${Math.max(0, barLeft)}%`,
                            width: `${Math.max(0.5, Math.min(barWidth, 100 - Math.max(0, barLeft)))}%`,
                          }}
                        >
                          <span className="text-white text-xs font-medium truncate">{phase.name}</span>
                        </div>
                      )}
                      {/* Progress overlay */}
                      {hasBar && phase.progress_percent > 0 && (
                        <div
                          className="absolute top-1 h-6 bg-white/30 rounded"
                          style={{
                            left: `${Math.max(0, barLeft)}%`,
                            width: `${Math.max(0.5, Math.min(barWidth * (phase.progress_percent / 100), 100 - Math.max(0, barLeft)))}%`,
                          }}
                        />
                      )}
                      {/* Milestones */}
                      {phaseMilestones.map(m => {
                        const mLeft = (diffDays(chartStart, new Date(m.due_date!)) / totalDays) * 100
                        return (
                          <div
                            key={m.id}
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-purple-600 border-2 border-white shadow-sm"
                            style={{ left: `calc(${mLeft}% - 6px)` }}
                            title={m.name}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Standalone milestones (no phase) */}
            {milestonesWithDates.filter(m => !m.phase_id).map(m => {
              const mLeft = (diffDays(chartStart, new Date(m.due_date!)) / totalDays) * 100
              return (
                <div key={m.id} className="flex items-center gap-2 mt-2">
                  <div className="w-48 shrink-0">
                    <p className="text-sm text-slate-600 truncate">{m.name}</p>
                    <p className="text-xs text-slate-400">milestone</p>
                  </div>
                  <div className="flex-1 relative h-8 bg-slate-50 rounded border border-slate-100">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-purple-600 border-2 border-white shadow-sm"
                      style={{ left: `calc(${mLeft}% - 6px)` }}
                      title={m.name}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
