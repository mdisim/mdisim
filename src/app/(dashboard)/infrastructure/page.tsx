import { createClient } from '@/lib/supabase/server'
import { AlertTriangle, Users, Layers, TrendingUp, Activity } from 'lucide-react'
import { StatusBadge } from '@/components/ui/badge'

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function kpiCard(label: string, value: string | number, sub?: string) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default async function InfrastructurePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()
  const companyId = profile?.company_id

  const projectsQuery = companyId
    ? supabase.from('projects').select('*').eq('company_id', companyId)
    : supabase.from('projects').select('*').eq('created_by', user.id)

  const [
    { data: projects },
    { data: allCosts },
    { data: allBoq },
    { data: allPhases },
  ] = await Promise.all([
    projectsQuery,
    supabase.from('cost_entries').select('project_id, amount'),
    supabase.from('boq_items').select('project_id, total_amount'),
    supabase.from('project_phases').select('project_id, progress_percent'),
  ])

  const projectsList = projects ?? []
  const costs = allCosts ?? []
  const boqItems = allBoq ?? []
  const phases = allPhases ?? []

  const projectIds = projectsList.map(p => p.id)

  // SDR data
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const [
    { data: recentReports },
    { data: openIssuesData },
    { data: workforceData },
    { data: concreteData },
  ] = await Promise.all([
    projectIds.length > 0
      ? supabase.from('site_daily_reports').select('id, project_id, report_date').in('project_id', projectIds).gte('report_date', thirtyDaysAgo).order('report_date', { ascending: false })
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? supabase.from('sdr_issues').select('id, description, severity, status, report_id, site_daily_reports!inner(project_id, report_date, projects!inner(name))').eq('status', 'open').order('created_at', { ascending: false }).limit(10)
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? supabase.from('sdr_workforce').select('actual_count, report_id, site_daily_reports!inner(report_date, project_id)').gte('site_daily_reports.report_date', sevenDaysAgo)
      : Promise.resolve({ data: [] }),
    projectIds.length > 0
      ? supabase.from('concrete_pours').select('*, projects!inner(name)').in('project_id', projectIds).order('pour_date', { ascending: false }).limit(5)
      : Promise.resolve({ data: [] }),
  ])

  const reports = recentReports ?? []
  const openIssues = (openIssuesData ?? []) as Record<string, unknown>[]
  const workforce = (workforceData ?? []) as Record<string, unknown>[]
  const concretes = (concreteData ?? []) as Record<string, unknown>[]

  // Compute per-project metrics
  const costByProject = costs.reduce<Record<string, number>>((acc, c) => {
    acc[c.project_id] = (acc[c.project_id] ?? 0) + c.amount
    return acc
  }, {})
  const boqByProject = boqItems.reduce<Record<string, number>>((acc, b) => {
    acc[b.project_id] = (acc[b.project_id] ?? 0) + b.total_amount
    return acc
  }, {})
  const phasesByProject = phases.reduce<Record<string, number[]>>((acc, p) => {
    if (!acc[p.project_id]) acc[p.project_id] = []
    acc[p.project_id].push(p.progress_percent ?? 0)
    return acc
  }, {})
  const issuesByProject = openIssues.reduce<Record<string, number>>((acc, issue) => {
    const sdr = issue.site_daily_reports as Record<string, unknown> | null
    if (sdr) {
      const pid = sdr.project_id as string
      acc[pid] = (acc[pid] ?? 0) + 1
    }
    return acc
  }, {})
  const recentReportByProject: Record<string, string> = {}
  for (const r of reports) {
    if (!recentReportByProject[r.project_id]) recentReportByProject[r.project_id] = r.report_date
  }

  // KPIs
  const activeProjects = projectsList.filter(p => p.status === 'active').length
  const totalOpenIssues = openIssues.length

  // Workforce last 7 days per day
  const workforceDays: Record<string, number> = {}
  for (const w of workforce) {
    const sdr = w.site_daily_reports as Record<string, unknown> | null
    if (sdr) {
      const day = sdr.report_date as string
      workforceDays[day] = (workforceDays[day] ?? 0) + (w.actual_count as number)
    }
  }
  const last7Days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    last7Days.push(d.toISOString().split('T')[0])
  }
  const maxWorkforce = Math.max(...last7Days.map(d => workforceDays[d] ?? 0), 1)
  const totalWorkforce = last7Days.reduce((s, d) => s + (workforceDays[d] ?? 0), 0)

  const projectsOnSchedule = projectsList.filter(p => {
    const days = daysUntil(p.end_date)
    return days === null || days > 0
  }).length

  // Budget health (how many projects under 90% budget)
  const budgetHealthy = projectsList.filter(p => {
    const spent = costByProject[p.id] ?? 0
    return p.budget <= 0 || spent / p.budget < 0.9
  }).length
  const budgetHealthPct = projectsList.length > 0 ? Math.round((budgetHealthy / projectsList.length) * 100) : 100

  // Over-budget alert projects
  const alertProjects = projectsList.filter(p => {
    const spent = costByProject[p.id] ?? 0
    return p.budget > 0 && spent / p.budget > 0.9
  })

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {alertProjects.length > 0 && (
        <div className="bg-red-600 text-white rounded-xl px-5 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="shrink-0" />
          <p className="text-sm font-semibold">
            BUDGET ALERT — Projects approaching or over budget:{' '}
            {alertProjects.map(p => p.name).join(', ')}
          </p>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Infrastructure Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Executive operations overview across all projects.</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpiCard('Active Projects', activeProjects)}
        {kpiCard('Total Workforce', totalWorkforce, 'last 7 days')}
        {kpiCard('Open Issues', totalOpenIssues)}
        {kpiCard('On Schedule', projectsOnSchedule, `of ${projectsList.length} projects`)}
        {kpiCard('Budget Health', `${budgetHealthPct}%`, `${budgetHealthy}/${projectsList.length} healthy`)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Health Matrix */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-500" /> Project Health Matrix
          </h2>
          {projectsList.length === 0 ? (
            <p className="text-slate-400 text-sm">No projects found.</p>
          ) : (
            <div className="space-y-4">
              {projectsList.map(p => {
                const spent = costByProject[p.id] ?? 0
                const budgetPct = p.budget > 0 ? Math.min((spent / p.budget) * 100, 100) : 0
                const phaseArr = phasesByProject[p.id] ?? []
                const phasePct = phaseArr.length > 0
                  ? phaseArr.reduce((s, v) => s + v, 0) / phaseArr.length
                  : 0
                const days = daysUntil(p.end_date)
                const issues = issuesByProject[p.id] ?? 0
                const budgetWarning = budgetPct > 90
                return (
                  <div key={p.id} className="border border-slate-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-slate-800 text-sm">{p.name}</p>
                      <div className="flex items-center gap-2">
                        {budgetWarning && <AlertTriangle size={13} className="text-red-500" />}
                        {issues > 0 && <AlertTriangle size={13} className="text-amber-500" />}
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                          <span>Budget</span><span>{budgetPct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full">
                          <div
                            className={`h-full rounded-full ${budgetPct > 90 ? 'bg-red-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${budgetPct}%` }}
                          />
                        </div>
                      </div>
                      {phaseArr.length > 0 && (
                        <div>
                          <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                            <span>Phase Progress</span><span>{phasePct.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${phasePct}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">
                      {days === null ? 'No end date' : days < 0 ? `${Math.abs(days)}d overdue` : `${days}d remaining`}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Active Issues Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" /> Active Issues
          </h2>
          {openIssues.length === 0 ? (
            <p className="text-slate-400 text-sm">No open issues.</p>
          ) : (
            <div className="space-y-2">
              {openIssues.map((issue) => {
                const sdr = issue.site_daily_reports as Record<string, unknown> | null
                const proj = sdr?.projects as Record<string, unknown> | null
                const sev = issue.severity as string
                const sevColor: Record<string, string> = { critical: 'text-red-600 bg-red-50', high: 'text-orange-600 bg-orange-50', medium: 'text-amber-600 bg-amber-50', low: 'text-green-600 bg-green-50' }
                return (
                  <div key={issue.id as string} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold shrink-0 mt-0.5 ${sevColor[sev] ?? 'text-slate-600 bg-slate-100'}`}>{sev}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 leading-snug">{issue.description as string}</p>
                      {proj && <p className="text-xs text-slate-400">{proj.name as string}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Workforce Chart + Concrete Pours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Users size={16} className="text-amber-500" /> Workforce — Last 7 Days
          </h2>
          <div className="flex items-end gap-2 h-32">
            {last7Days.map(day => {
              const count = workforceDays[day] ?? 0
              const pct = Math.round((count / maxWorkforce) * 100)
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-slate-500">{count}</span>
                  <div className="w-full flex items-end" style={{ height: '80px' }}>
                    <div
                      className="w-full bg-amber-400 rounded-t"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">{new Date(day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Layers size={16} className="text-amber-500" /> Recent Concrete Pours
          </h2>
          {concretes.length === 0 ? (
            <p className="text-slate-400 text-sm">No concrete pours recorded.</p>
          ) : (
            <div className="space-y-2">
              {concretes.map(c => {
                const proj = c.projects as Record<string, unknown> | null
                return (
                  <div key={c.id as string} className="flex items-start justify-between p-2 rounded-lg bg-slate-50">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{(c.element_type as string) ?? 'Pour'}</p>
                      <p className="text-xs text-slate-400">{proj?.name as string} · {c.pour_date as string}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-600">{(c.volume_m3 as number)?.toFixed(1)} m³</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
