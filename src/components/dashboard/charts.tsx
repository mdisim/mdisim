'use client'

import { Project } from '@/lib/types'

interface BudgetChartProps {
  projects: Project[]
  costsByProject: Record<string, number>
}

export function BudgetChart({ projects, costsByProject }: BudgetChartProps) {
  if (projects.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-800 mb-4">Budget vs Spent per Project</h3>
      <div className="space-y-4">
        {projects.slice(0, 6).map((project) => {
          const spent = costsByProject[project.id] ?? 0
          const budget = project.budget || 0
          const spentPct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
          const overBudget = spent > budget && budget > 0
          return (
            <div key={project.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-700 truncate max-w-[60%]">{project.name}</span>
                <span className={`text-xs font-medium ${overBudget ? 'text-red-600' : 'text-slate-500'}`}>
                  ${spent.toLocaleString()} / ${budget.toLocaleString()}
                </span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className={`h-full rounded-full transition-all ${overBudget ? 'bg-red-500' : spentPct > 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
                  style={{ width: `${spentPct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface StatusChartProps {
  counts: { planning: number; active: number; on_hold: number; completed: number }
}

export function StatusDonut({ counts }: StatusChartProps) {
  const total = counts.planning + counts.active + counts.on_hold + counts.completed
  if (total === 0) return null

  const segments = [
    { label: 'Active', count: counts.active, color: '#22c55e' },
    { label: 'Planning', count: counts.planning, color: '#94a3b8' },
    { label: 'On Hold', count: counts.on_hold, color: '#f59e0b' },
    { label: 'Completed', count: counts.completed, color: '#2563EB' },
  ]

  // Build conic-gradient
  let cumulative = 0
  const gradientParts: string[] = []
  for (const seg of segments) {
    const pct = (seg.count / total) * 100
    if (pct > 0) {
      gradientParts.push(`${seg.color} ${cumulative}% ${cumulative + pct}%`)
      cumulative += pct
    }
  }
  const gradient = `conic-gradient(${gradientParts.join(', ')})`

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-800 mb-4">Project Status Breakdown</h3>
      <div className="flex items-center gap-6">
        <div className="relative shrink-0">
          <div
            className="w-28 h-28 rounded-full"
            style={{ background: gradient }}
          />
          {/* Inner hole */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-slate-800">{total}</span>
            </div>
          </div>
        </div>
        <div className="space-y-2 flex-1">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: seg.color }} />
                <span className="text-sm text-slate-600">{seg.label}</span>
              </div>
              <span className="text-sm font-medium text-slate-800">{seg.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
