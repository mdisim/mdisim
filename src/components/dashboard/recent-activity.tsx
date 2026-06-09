import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge, getStatusBadgeVariant, formatStatusLabel } from '@/components/ui/badge'
import { Project } from '@/lib/types'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface RecentActivityProps {
  projects: Project[]
}

export function RecentActivity({ projects }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Recent Projects</h3>
        <Link
          href="/projects"
          className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
        >
          View all <ArrowRight size={14} />
        </Link>
      </div>
      <div className="divide-y divide-slate-100">
        {projects.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-400">
            No projects yet. Create your first project to get started.
          </div>
        ) : (
          projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{project.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {project.client_name && `${project.client_name} · `}
                  {formatDate(project.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-700">
                  {formatCurrency(project.budget)}
                </span>
                <Badge variant={getStatusBadgeVariant(project.status)}>
                  {formatStatusLabel(project.status)}
                </Badge>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
