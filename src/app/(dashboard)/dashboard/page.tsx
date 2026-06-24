'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FolderKanban,
  Ruler,
  DollarSign,
  BookOpen,
  Plus,
  Upload,
  FileSpreadsheet,
  BarChart3,
  MapPin,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { getProjects } from '@/app/actions/projects'
import type { Project } from '@/lib/types'

// ── Stat Card ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  label: string
  value: string | number
  trend?: string
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
            iconBg
          )}
        >
          <Icon className={cn('h-6 w-6', iconColor)} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        </div>
        {trend && (
          <span className="ml-auto flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </span>
        )}
      </CardContent>
    </Card>
  )
}

// ── Quick Action Card ───────────────────────────────────────────────────

function QuickActionCard({
  icon: Icon,
  label,
  description,
  href,
  comingSoon,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
  href?: string
  comingSoon?: boolean
  onClick?: () => void
}) {
  const router = useRouter()

  return (
    <Card
      className={cn(
        'cursor-pointer group',
        comingSoon && 'opacity-80'
      )}
      onClick={() => {
        if (href) router.push(href)
        else onClick?.()
      }}
    >
      <CardContent className="flex flex-col items-center text-center gap-3 py-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors dark:bg-blue-900/30 dark:text-blue-400 dark:group-hover:bg-blue-900/50">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">
            {label}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
        {comingSoon && (
          <Badge variant="warning" className="text-[10px]">
            Coming Soon
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main Dashboard ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProjects()
      .then((data) => setProjects(data))
      .finally(() => setLoading(false))
  }, [])

  const totalBudget = projects.reduce((sum, p) => sum + (p.budget ?? 0), 0)

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Overview of your construction projects and activity.
        </p>
      </div>

      {/* ── Stats Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FolderKanban}
          iconBg="bg-violet-100 dark:bg-violet-900/30"
          iconColor="text-violet-600 dark:text-violet-400"
          label="Total Projects"
          value={loading ? '...' : projects.length}
        />
        <StatCard
          icon={Ruler}
          iconBg="bg-sky-100 dark:bg-sky-900/30"
          iconColor="text-sky-600 dark:text-sky-400"
          label="Active Measurements"
          value="—"
        />
        <StatCard
          icon={DollarSign}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
          label="BOQ Value"
          value={
            loading
              ? '...'
              : totalBudget > 0
                ? formatCurrency(totalBudget)
                : '—'
          }
        />
        <StatCard
          icon={BookOpen}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
          label="Library Items"
          value="—"
        />
      </div>

      {/* ── Recent Projects ──────────────────────────────────────── */}
      <section>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Projects</CardTitle>
            {projects.length > 0 && (
              <button
                onClick={() => router.push('/projects')}
                className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View all
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-36 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700/50"
                  />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderKanban className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                  No projects yet
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Create your first project to get started.
                </p>
                <button
                  onClick={() => router.push('/projects')}
                  className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  New Project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.slice(0, 6).map((project) => (
                  <div
                    key={project.id}
                    onClick={() =>
                      router.push(`/projects/${project.id}/measurements`)
                    }
                    className={cn(
                      'group cursor-pointer rounded-xl border border-slate-200 p-4 transition-all hover:border-blue-300 hover:shadow-md',
                      'dark:border-slate-700 dark:hover:border-blue-600'
                    )}
                  >
                    <h3 className="truncate font-semibold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                      {project.name}
                    </h3>
                    {project.client_name && (
                      <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                        {project.client_name}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                      {project.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {project.location}
                        </span>
                      )}
                      <Badge>{project.currency}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      <Clock className="h-3 w-3" />
                      {formatDate(project.updated_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Quick Actions ────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <QuickActionCard
            icon={Plus}
            label="New Project"
            description="Start a new construction project"
            href="/projects"
          />
          <QuickActionCard
            icon={Upload}
            label="Upload Drawing"
            description="Add drawings to a project"
            comingSoon
          />
          <QuickActionCard
            icon={FileSpreadsheet}
            label="Create BOQ"
            description="Build a bill of quantities"
            comingSoon
          />
          <QuickActionCard
            icon={BarChart3}
            label="View Reports"
            description="Analytics and export reports"
            comingSoon
          />
        </div>
      </section>

      {/* ── Activity Feed ────────────────────────────────────────── */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                No recent activity
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Your project updates and actions will appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
