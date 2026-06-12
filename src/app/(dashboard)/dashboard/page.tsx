import { createClient } from '@/lib/supabase/server'
import { StatsCard } from '@/components/dashboard/stats-card'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { BudgetChart, StatusDonut } from '@/components/dashboard/charts'
import Link from 'next/link'
import {
  FolderKanban,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  Plus,
  UserPlus,
  FileText,
  Wallet,
} from 'lucide-react'
import { ils } from '@/lib/server-currency'
import { T } from '@/components/ui/translated-label'
import { TranslatedStats } from '@/components/dashboard/translated-stats'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch company name for welcome message
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

  const [
    { data: projects },
    { data: contractors },
    { data: costEntries },
    { data: payments },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('created_by', user!.id),
    supabase.from('contractors').select('*').eq('user_id', user!.id),
    supabase.from('cost_entries').select('amount, status, project_id').in(
      'project_id',
      (await supabase.from('projects').select('id').eq('created_by', user!.id)).data?.map(p => p.id) ?? []
    ),
    supabase.from('contractor_payments').select('amount, status, project_id').in(
      'project_id',
      (await supabase.from('projects').select('id').eq('created_by', user!.id)).data?.map(p => p.id) ?? []
    ),
  ])

  const totalBudget = projects?.reduce((sum, p) => sum + (p.budget || 0), 0) ?? 0
  const totalSpent = costEntries?.reduce((sum, c) => sum + (c.amount || 0), 0) ?? 0
  const activeProjects = projects?.filter(p => p.status === 'active').length ?? 0
  const pendingPayments = payments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) ?? 0
  const budgetRemaining = totalBudget - totalSpent

  const recentProjects = projects?.slice(-5).reverse() ?? []

  // Build costs-by-project map for chart
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

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Professional gradient banner */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5282] rounded-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-1">ANGEL D.C. Platform</p>
            <h1 className="text-2xl font-bold"><T k="welcome_back" fallback="Welcome back" />, {companyName}</h1>
            <p className="text-blue-200 text-sm mt-1"><T k="dashboard_subtitle" fallback="Overview of your construction projects" /></p>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs">{new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/projects" className="flex items-center gap-3 p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors group">
          <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center shrink-0">
            <Plus size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">New Project</p>
            <p className="text-xs text-slate-500">Start a new construction project</p>
          </div>
        </Link>
        <Link href="/contractors" className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors group">
          <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
            <UserPlus size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Add Contractor</p>
            <p className="text-xs text-slate-500">Register a new contractor</p>
          </div>
        </Link>
        <Link href="/projects" className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-colors group">
          <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center shrink-0">
            <FileText size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">View Reports</p>
            <p className="text-xs text-slate-500">Daily site reports and logs</p>
          </div>
        </Link>
      </div>

      {/* Stats Grid — client component for i18n */}
      <TranslatedStats
        totalProjects={projects?.length ?? 0}
        activeProjects={activeProjects}
        completedProjects={statusCounts.completed}
        onHoldProjects={statusCounts.on_hold}
        totalBudget={totalBudget}
        totalSpent={totalSpent}
        budgetRemaining={budgetRemaining}
        formatCurrency={ils}
      />

      {/* Budget Progress */}
      {totalBudget > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">Overall Budget Usage</h3>
            <span className="text-sm text-slate-500">
              {ils(totalSpent)} / {ils(totalBudget)}
            </span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                totalSpent / totalBudget > 0.9 ? 'bg-red-500' :
                totalSpent / totalBudget > 0.7 ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {((totalSpent / totalBudget) * 100).toFixed(1)}% of total budget used
          </p>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetChart projects={projects ?? []} costsByProject={costsByProject} />
        <StatusDonut counts={statusCounts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Recent Projects</h3>
            <a href="/projects" className="text-amber-500 hover:text-amber-600 text-sm font-medium">View all</a>
          </div>
          {recentProjects.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <FolderKanban size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No projects yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <a
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{project.name}</p>
                    <p className="text-xs text-slate-400">{project.client_name || 'No client'}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    project.status === 'active' ? 'bg-green-100 text-green-700' :
                    project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    project.status === 'on_hold' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Pending Payments Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Payment Summary</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-100">
              <div className="flex items-center gap-3">
                <Clock size={20} className="text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">Pending Payments</p>
                  <p className="text-xs text-slate-500">Awaiting processing</p>
                </div>
              </div>
              <p className="font-bold text-amber-600">{ils(pendingPayments)}</p>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">Completed Payments</p>
                  <p className="text-xs text-slate-500">Successfully processed</p>
                </div>
              </div>
              <p className="font-bold text-green-600">
                {ils(payments?.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0) ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <RecentActivity projects={recentProjects} />
    </div>
  )
}
