import { createClient } from '@/lib/supabase/server'
import { StatsCard } from '@/components/dashboard/stats-card'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import {
  FolderKanban,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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

  const recentProjects = projects?.slice(-5).reverse() ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of your construction projects</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard
          title="Total Projects"
          value={projects?.length ?? 0}
          icon={FolderKanban}
          color="blue"
          className="xl:col-span-1"
        />
        <StatsCard
          title="Active Projects"
          value={activeProjects}
          icon={Clock}
          color="amber"
          className="xl:col-span-1"
        />
        <StatsCard
          title="Total Budget"
          value={`$${totalBudget.toLocaleString()}`}
          icon={DollarSign}
          color="green"
          className="xl:col-span-2"
        />
        <StatsCard
          title="Total Spent"
          value={`$${totalSpent.toLocaleString()}`}
          icon={TrendingUp}
          color="red"
          className="xl:col-span-1"
        />
        <StatsCard
          title="Contractors"
          value={contractors?.length ?? 0}
          icon={Users}
          color="purple"
          className="xl:col-span-1"
        />
      </div>

      {/* Budget Progress */}
      {totalBudget > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">Overall Budget Usage</h3>
            <span className="text-sm text-slate-500">
              ${totalSpent.toLocaleString()} / ${totalBudget.toLocaleString()}
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
              <p className="font-bold text-amber-600">${pendingPayments.toLocaleString()}</p>
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
                ${(payments?.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0) ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <RecentActivity projects={recentProjects} />
    </div>
  )
}
