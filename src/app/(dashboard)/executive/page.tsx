import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ils } from '@/lib/server-currency'
import { EVMDashboard } from '@/components/executive/evm-dashboard'

function monthKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function getLast12Months(): string[] {
  const keys: string[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

function rankLabel(i: number): string {
  if (i === 0) return '1st'
  if (i === 1) return '2nd'
  if (i === 2) return '3rd'
  return `${i + 1}th`
}

export default async function ExecutiveDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user!.id)
    .single()

  const companyId = profile?.company_id

  const [
    { data: projects },
    { data: allCosts },
    { data: allPayments },
    { data: allPhases },
    { data: allMilestones },
    { data: recentPours },
    { data: recentRebar },
  ] = await Promise.all([
    companyId
      ? supabase.from('projects').select('*').eq('company_id', companyId)
      : supabase.from('projects').select('*').eq('created_by', user!.id),
    supabase.from('cost_entries').select('amount, cost_date, project_id'),
    supabase.from('contractor_payments').select('amount, payment_date, contractor_id, status, project_id, contractor:contractors(id, name, company)').eq('status', 'completed'),
    supabase.from('project_phases').select('project_id, name, end_date, status, progress_percent'),
    supabase.from('project_milestones').select('project_id, name, due_date, status'),
    supabase.from('concrete_pours').select('project_id, pour_date, element_type, volume_m3').order('pour_date', { ascending: false }).limit(10),
    supabase.from('reinforcement_records').select('project_id, record_date, element_type, quantity_kg').order('record_date', { ascending: false }).limit(10),
  ])

  const projectsList = projects ?? []
  const costs = allCosts ?? []
  const payments = allPayments ?? []
  const phases = allPhases ?? []
  const milestones = allMilestones ?? []
  const pours = recentPours ?? []
  const rebar = recentRebar ?? []

  const projectIds = new Set(projectsList.map(p => p.id))
  const companyCosts = costs.filter(c => projectIds.has(c.project_id))

  const totalBudget = projectsList.reduce((s, p) => s + (p.budget ?? 0), 0)
  const totalSpent = companyCosts.reduce((s, c) => s + c.amount, 0)
  const active = projectsList.filter(p => p.status === 'active').length
  const completed = projectsList.filter(p => p.status === 'completed').length
  const budgetVariance = totalBudget > 0 ? ((totalBudget - totalSpent) / totalBudget) * 100 : 0

  // Cost map per project
  const projectCostMap: Record<string, number> = {}
  for (const c of companyCosts) {
    projectCostMap[c.project_id] = (projectCostMap[c.project_id] ?? 0) + c.amount
  }

  // Phase progress per project
  const projectPhaseMap: Record<string, number[]> = {}
  for (const ph of phases) {
    if (!projectPhaseMap[ph.project_id]) projectPhaseMap[ph.project_id] = []
    projectPhaseMap[ph.project_id].push(ph.progress_percent)
  }

  const today = new Date().toISOString().split('T')[0]

  // Alert banners
  const budgetAlerts = projectsList.filter(p => p.budget > 0 && (projectCostMap[p.id] ?? 0) / p.budget > 0.9)
  const delayedProjects = projectsList.filter(p => p.end_date && p.end_date < today && p.status !== 'completed')

  // Monthly expenditure last 12 months
  const last12 = getLast12Months()
  const monthlySpend: Record<string, number> = {}
  for (const key of last12) monthlySpend[key] = 0
  for (const c of companyCosts) {
    const key = monthKey(c.cost_date)
    if (monthlySpend[key] !== undefined) monthlySpend[key] += c.amount
  }
  const maxMonthly = Math.max(...Object.values(monthlySpend), 1)

  // Contractor performance
  const contractorMap: Record<string, { name: string; company: string | null; total: number; projects: Set<string> }> = {}
  for (const p of payments) {
    const c = p.contractor as unknown as { id: string; name: string; company: string | null } | null
    if (!c) continue
    if (!contractorMap[c.id]) contractorMap[c.id] = { name: c.name, company: c.company, total: 0, projects: new Set() }
    contractorMap[c.id].total += p.amount
    if (p.project_id) contractorMap[c.id].projects.add(p.project_id)
  }
  const leaderboard = Object.values(contractorMap).sort((a, b) => b.total - a.total).slice(0, 10)
  const maxContractor = Math.max(...leaderboard.map(l => l.total), 1)

  // Delayed activities
  const delayedPhases = phases.filter(ph => ph.end_date && ph.end_date < today && ph.status !== 'completed')
  const delayedMilestones = milestones.filter(m => m.due_date && m.due_date < today && m.status !== 'completed')

  // Recent pours + rebar combined, sorted by date
  type RecentItem = { type: 'pour' | 'rebar'; date: string; element_type: string; project_id: string; amount: number; unit: string }
  const recentItems: RecentItem[] = [
    ...pours.map(p => ({ type: 'pour' as const, date: p.pour_date, element_type: p.element_type, project_id: p.project_id, amount: p.volume_m3, unit: 'm³' })),
    ...rebar.map(r => ({ type: 'rebar' as const, date: r.record_date, element_type: r.element_type, project_id: r.project_id, amount: r.quantity_kg ?? 0, unit: 'kg' })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)

  const projectNameMap: Record<string, string> = {}
  for (const p of projectsList) projectNameMap[p.id] = p.name

  // EVM computation
  const todayMs = Date.now()
  const evmData = projectsList
    .filter(p => (p.budget ?? 0) > 0)
    .map(p => {
      const bac: number = p.budget
      const ac: number = projectCostMap[p.id] ?? 0

      // Planned Value: budget × (days elapsed / total duration)
      let pv = 0
      if (p.start_date && p.end_date) {
        const start = new Date(p.start_date).getTime()
        const end = new Date(p.end_date).getTime()
        const totalDuration = end - start
        if (totalDuration > 0) {
          const elapsed = Math.min(Math.max(todayMs - start, 0), totalDuration)
          pv = bac * (elapsed / totalDuration)
        }
      }

      // Earned Value: budget × (avg phase progress / 100)
      const phArr = projectPhaseMap[p.id] ?? []
      const avgProgress = phArr.length > 0
        ? phArr.reduce((s, v) => s + v, 0) / phArr.length
        : 0
      const ev = bac * (avgProgress / 100)

      const cpi = ac > 0 ? ev / ac : 1
      const spi = pv > 0 ? ev / pv : 1
      const cv = ev - ac
      const sv = ev - pv
      const eac = cpi > 0 ? bac / cpi : bac

      return {
        id: p.id,
        name: p.name,
        budget: bac,
        actualCost: ac,
        plannedValue: pv,
        earnedValue: ev,
        cpi,
        spi,
        cv,
        sv,
        eac,
        status: p.status ?? 'unknown',
      }
    })

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Dark header strip */}
      <div className="bg-slate-900 rounded-xl px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">ANGEL D.C.</h1>
          <p className="text-amber-400 text-sm font-medium mt-0.5">Executive Operations Dashboard</p>
        </div>
        <p className="text-slate-400 text-sm">{currentDate}</p>
      </div>

      {/* Alert Banners */}
      {budgetAlerts.length > 0 && (
        <div className="bg-red-600 rounded-xl px-5 py-3 text-white">
          <span className="font-semibold">Budget Alert:</span> {budgetAlerts.length} project{budgetAlerts.length > 1 ? 's' : ''} over 90% budget —{' '}
          {budgetAlerts.map(p => p.name).join(', ')}
        </div>
      )}
      {delayedProjects.length > 0 && (
        <div className="bg-amber-500 rounded-xl px-5 py-3 text-white">
          <span className="font-semibold">Schedule Alert:</span> {delayedProjects.length} delayed project{delayedProjects.length > 1 ? 's' : ''} —{' '}
          {delayedProjects.map(p => p.name).join(', ')}
        </div>
      )}
      {budgetAlerts.length === 0 && delayedProjects.length === 0 && (
        <div className="bg-green-600 rounded-xl px-5 py-3 text-white">
          <span className="font-semibold">All Clear:</span> No budget or schedule alerts at this time.
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Projects', value: projectsList.length, color: 'text-slate-900' },
          { label: 'Active', value: active, color: 'text-green-600' },
          { label: 'Completed', value: completed, color: 'text-blue-600' },
          { label: 'Total Budget', value: `₪${(totalBudget / 1e6).toFixed(1)}M`, color: 'text-slate-900' },
          { label: 'Total Spent', value: `₪${(totalSpent / 1e6).toFixed(2)}M`, color: 'text-amber-600' },
          {
            label: 'Budget Variance',
            value: `${budgetVariance.toFixed(1)}%`,
            color: budgetVariance >= 0 ? 'text-green-600' : 'text-red-600',
          },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Section 3: Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Portfolio Health */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Project Portfolio Health</h2>
          {projectsList.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No projects</p>
          ) : (
            <div className="space-y-3">
              {projectsList.map(p => {
                const spent = projectCostMap[p.id] ?? 0
                const pct = p.budget > 0 ? Math.min((spent / p.budget) * 100, 100) : 0
                const phArr = projectPhaseMap[p.id] ?? []
                const phaseProgress = phArr.length > 0 ? Math.round(phArr.reduce((s, v) => s + v, 0) / phArr.length) : 0
                const daysLeft = p.end_date ? Math.round((new Date(p.end_date).getTime() - Date.now()) / 86400000) : null
                const health = pct < 90 && (daysLeft === null || daysLeft > 0) ? 'green' : pct < 100 && (daysLeft === null || daysLeft > -30) ? 'amber' : 'red'
                return (
                  <div key={p.id} className="text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <Link href={`/projects/${p.id}`} className="font-medium text-slate-800 hover:text-amber-600 flex-1 truncate">{p.name}</Link>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        <span className={`px-1.5 py-0.5 rounded text-xs capitalize ${p.status === 'active' ? 'bg-green-100 text-green-700' : p.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{p.status}</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${health === 'green' ? 'bg-green-500' : health === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-slate-500">{pct.toFixed(0)}%</span>
                      <span className="w-16 text-right text-slate-400">Phase: {phaseProgress}%</span>
                      {daysLeft !== null && (
                        <span className={`w-20 text-right font-medium ${daysLeft < 0 ? 'text-red-600' : daysLeft < 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d over` : `${daysLeft}d left`}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Contractor Performance Ranking */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Contractor Performance Ranking</h2>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No contractor payments</p>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-8 text-center text-xs font-bold shrink-0 ${i < 3 ? 'text-amber-600' : 'text-slate-400'}`}>{rankLabel(i)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{c.name}{c.company ? ` — ${c.company}` : ''}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(c.total / maxContractor) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">{c.projects.size} proj</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 whitespace-nowrap shrink-0">{ils(c.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monthly Expenditure Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Monthly Expenditure — Last 12 Months</h2>
        <div className="flex items-end gap-2 h-48">
          {last12.map(key => {
            const val = monthlySpend[key] ?? 0
            const h = maxMonthly > 0 ? (val / maxMonthly) * 160 : 0
            return (
              <div key={key} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-slate-500 text-center leading-tight">{val > 0 ? `₪${(val / 1000).toFixed(0)}k` : ''}</span>
                <div className="w-full bg-amber-400 rounded-t transition-all" style={{ height: `${Math.max(h, 2)}px` }} />
                <span className="text-xs text-slate-400 whitespace-nowrap">{monthLabel(key)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section 5: Delayed Activities + Recent Concrete/Rebar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delayed Activities */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Delayed Activities</h2>
          {delayedProjects.length === 0 && delayedPhases.length === 0 && delayedMilestones.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No delayed activities</p>
          ) : (
            <div className="space-y-2">
              {delayedProjects.map(p => {
                const days = Math.round((Date.now() - new Date(p.end_date).getTime()) / 86400000)
                return (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700 shrink-0">Project</span>
                    <Link href={`/projects/${p.id}`} className="flex-1 text-slate-700 hover:text-amber-600 truncate">{p.name}</Link>
                    <span className="text-red-600 font-semibold text-xs shrink-0">{days}d overdue</span>
                  </div>
                )
              })}
              {delayedPhases.map(ph => {
                const days = Math.round((Date.now() - new Date(ph.end_date!).getTime()) / 86400000)
                const projName = projectNameMap[ph.project_id] ?? ph.project_id
                return (
                  <div key={`ph-${ph.project_id}-${ph.name}`} className="flex items-center gap-2 text-sm">
                    <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700 shrink-0">Phase</span>
                    <span className="flex-1 text-slate-700 truncate">{ph.name} — {projName}</span>
                    <span className="text-red-600 font-semibold text-xs shrink-0">{days}d overdue</span>
                  </div>
                )
              })}
              {delayedMilestones.map(m => {
                const days = Math.round((Date.now() - new Date(m.due_date!).getTime()) / 86400000)
                const projName = projectNameMap[m.project_id] ?? m.project_id
                return (
                  <div key={`m-${m.project_id}-${m.name}`} className="flex items-center gap-2 text-sm">
                    <span className="px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-700 shrink-0">Milestone</span>
                    <span className="flex-1 text-slate-700 truncate">{m.name} — {projName}</span>
                    <span className="text-red-600 font-semibold text-xs shrink-0">{days}d overdue</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Concrete Pours & Rebar */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Recent Concrete Pours &amp; Rebar</h2>
          {recentItems.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No records</p>
          ) : (
            <div className="space-y-2">
              {recentItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className={`px-1.5 py-0.5 rounded text-xs shrink-0 ${item.type === 'pour' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {item.type === 'pour' ? 'Pour' : 'Rebar'}
                  </span>
                  <span className="text-slate-500 text-xs shrink-0">{item.date}</span>
                  <span className="flex-1 text-slate-700 truncate">{item.element_type}</span>
                  <span className="text-xs text-slate-400 shrink-0">{projectNameMap[item.project_id] ?? '—'}</span>
                  <span className="text-xs font-semibold text-slate-600 shrink-0">{item.amount.toLocaleString()} {item.unit}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
