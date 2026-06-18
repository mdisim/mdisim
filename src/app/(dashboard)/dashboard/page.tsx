import { createClient } from '@/lib/supabase/server'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { BudgetChart, StatusDonut } from '@/components/dashboard/charts'
import Link from 'next/link'
import {
  FolderKanban,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  Image,
  FileText,
  Wrench,
  Ruler,
  TrendingUp,
} from 'lucide-react'
import { ils } from '@/lib/server-currency'
import { T } from '@/components/ui/translated-label'
import { TranslatedStats } from '@/components/dashboard/translated-stats'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let companyName = 'ANGEL D.C.'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('companies(name)')
      .eq('id', user.id)
      .single()
    if (profile && profile.companies && !Array.isArray(profile.companies)) {
      companyName = (profile.companies as { name: string }).name
    }
  }

  const projectIds = (await supabase.from('projects').select('id').eq('created_by', user!.id)).data?.map(p => p.id) ?? []

  const [
    { data: projects },
    { data: contractors },
    { data: costEntries },
    { data: payments },
    { data: recentDrawings },
    { data: recentBoqItems },
    { data: recentReports },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('created_by', user!.id),
    supabase.from('contractors').select('*').eq('user_id', user!.id),
    supabase.from('cost_entries').select('amount, status, project_id').in('project_id', projectIds),
    supabase.from('contractor_payments').select('amount, status, project_id').in('project_id', projectIds),
    supabase.from('drawing_files').select('id, name, project_id, file_type, created_at, projects(name)').in('project_id', projectIds).order('created_at', { ascending: false }).limit(5),
    supabase.from('boq_items').select('id, description, total_amount, project_id, projects(name)').in('project_id', projectIds).order('created_at', { ascending: false }).limit(5),
    supabase.from('site_daily_reports').select('id, report_date, project_id, work_status, projects(name)').in('project_id', projectIds).order('report_date', { ascending: false }).limit(5),
  ])

  const totalBudget = projects?.reduce((sum, p) => sum + (p.budget || 0), 0) ?? 0
  const totalSpent = costEntries?.reduce((sum, c) => sum + (c.amount || 0), 0) ?? 0
  const activeProjects = projects?.filter(p => p.status === 'active').length ?? 0
  const pendingPayments = payments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) ?? 0
  const budgetRemaining = totalBudget - totalSpent

  const activeProjectsList = projects?.filter(p => p.status === 'active').slice(0, 5) ?? []
  const recentProjects = projects?.slice(-5).reverse() ?? []

  const costsByProject: Record<string, number> = {}
  costEntries?.forEach(c => {
    costsByProject[c.project_id] = (costsByProject[c.project_id] ?? 0) + c.amount
  })

  const statusCounts = {
    planning: projects?.filter(p => p.status === 'planning').length ?? 0,
    active: projects?.filter(p => p.status === 'active').length ?? 0,
    on_hold: projects?.filter(p => p.status === 'on_hold').length ?? 0,
    completed: projects?.filter(p => p.status === 'completed').length ?? 0,
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Compact Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            <T k="welcome_back" fallback="Welcome back" />, {companyName}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link
          href="/projects"
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Project
        </Link>
      </div>

      {/* KPI Stats */}
      <TranslatedStats
        totalProjects={projects?.length ?? 0}
        activeProjects={activeProjects}
        completedProjects={statusCounts.completed}
        onHoldProjects={statusCounts.on_hold}
        totalBudgetFormatted={ils(totalBudget)}
        totalSpentFormatted={ils(totalSpent)}
        budgetRemaining={budgetRemaining}
      />

      {/* Continue Working — Active Projects */}
      {activeProjectsList.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Continue Working
            </h2>
            <Link href="/projects" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
              All projects <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeProjectsList.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                  <FolderKanban size={18} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{project.name}</p>
                  <p className="text-xs text-slate-400">{project.client_name || 'No client'}</p>
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-500 ml-auto shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Construction Workflows Quick Access */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/projects', icon: Image, label: 'Drawings', desc: 'View & upload', color: 'blue' },
          { href: '/projects', icon: FileText, label: 'BOQ', desc: 'Quantities', color: 'green' },
          { href: '/projects', icon: Wrench, label: 'Rebar', desc: 'Schedules', color: 'purple' },
          { href: '/projects', icon: TrendingUp, label: 'Costs', desc: 'Track spending', color: 'orange' },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200/60 hover:shadow-md hover:border-blue-200 transition-all text-center group"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${item.color === 'blue' ? 'blue' : item.color === 'green' ? 'green' : item.color === 'purple' ? 'purple' : 'orange'}-50`}>
              <item.icon size={20} className={`text-${item.color === 'blue' ? 'blue' : item.color === 'green' ? 'green' : item.color === 'purple' ? 'purple' : 'orange'}-600`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{item.label}</p>
              <p className="text-[11px] text-slate-400">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Budget Progress */}
      {totalBudget > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">Overall Budget Usage</h3>
            <span className="text-sm text-slate-500 tabular-nums">
              {ils(totalSpent)} / {ils(totalBudget)}
            </span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                totalSpent / totalBudget > 0.9 ? 'bg-red-500' :
                totalSpent / totalBudget > 0.7 ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1.5 tabular-nums">
            {((totalSpent / totalBudget) * 100).toFixed(1)}% of total budget used
          </p>
        </div>
      )}

      {/* Recent Work Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Drawings */}
        <div className="bg-white rounded-xl border border-slate-200/60 p-5">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Image size={16} className="text-blue-600" />
            Recent Drawings
          </h3>
          {(!recentDrawings || recentDrawings.length === 0) ? (
            <p className="text-sm text-slate-400 py-4 text-center">No drawings uploaded yet</p>
          ) : (
            <div className="space-y-2">
              {recentDrawings.map((d: { id: string; name: string; project_id: string; file_type: string; created_at: string; projects: { name: string } | { name: string }[] | null }) => (
                <Link
                  key={d.id}
                  href={`/projects/${d.project_id}/takeoff`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center shrink-0">
                    <Image size={14} className="text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 truncate">{d.name}</p>
                    <p className="text-[11px] text-slate-400">{d.projects && !Array.isArray(d.projects) ? d.projects.name : ''}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent BOQ Items */}
        <div className="bg-white rounded-xl border border-slate-200/60 p-5">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <FileText size={16} className="text-green-600" />
            Recent BOQ
          </h3>
          {(!recentBoqItems || recentBoqItems.length === 0) ? (
            <p className="text-sm text-slate-400 py-4 text-center">No BOQ items yet</p>
          ) : (
            <div className="space-y-2">
              {recentBoqItems.map((b: { id: string; description: string; total_amount: number; project_id: string; projects: { name: string } | { name: string }[] | null }) => (
                <Link
                  key={b.id}
                  href={`/projects/${b.project_id}/boq`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 mr-2">
                    <p className="text-sm text-slate-700 truncate">{b.description}</p>
                    <p className="text-[11px] text-slate-400">{b.projects && !Array.isArray(b.projects) ? b.projects.name : ''}</p>
                  </div>
                  <span className="text-xs font-medium text-slate-500 tabular-nums shrink-0">{ils(b.total_amount)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Reports */}
        <div className="bg-white rounded-xl border border-slate-200/60 p-5">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Ruler size={16} className="text-purple-600" />
            Recent Reports
          </h3>
          {(!recentReports || recentReports.length === 0) ? (
            <p className="text-sm text-slate-400 py-4 text-center">No reports yet</p>
          ) : (
            <div className="space-y-2">
              {recentReports.map((r: { id: string; report_date: string; project_id: string; work_status: string; projects: { name: string } | { name: string }[] | null }) => (
                <Link
                  key={r.id}
                  href={`/projects/${r.project_id}/reports`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 mr-2">
                    <p className="text-sm text-slate-700">{new Date(r.report_date).toLocaleDateString('en-GB')}</p>
                    <p className="text-[11px] text-slate-400">{r.projects && !Array.isArray(r.projects) ? r.projects.name : ''}</p>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    r.work_status === 'normal' ? 'bg-green-50 text-green-700' :
                    r.work_status === 'delayed' ? 'bg-red-50 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{r.work_status || 'draft'}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetChart projects={projects ?? []} costsByProject={costsByProject} />
        <StatusDonut counts={statusCounts} />
      </div>

      {/* Payments Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-amber-500" />
            <div>
              <p className="text-sm font-medium text-slate-800">Pending Payments</p>
              <p className="text-xs text-slate-500">Awaiting processing</p>
            </div>
          </div>
          <p className="font-bold text-amber-600 tabular-nums">{ils(pendingPayments)}</p>
        </div>
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-green-500" />
            <div>
              <p className="text-sm font-medium text-slate-800">Completed Payments</p>
              <p className="text-xs text-slate-500">Successfully processed</p>
            </div>
          </div>
          <p className="font-bold text-green-600 tabular-nums">
            {ils(payments?.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0) ?? 0)}
          </p>
        </div>
      </div>

      <RecentActivity projects={recentProjects} />
    </div>
  )
}
