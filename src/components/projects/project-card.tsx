import { Project } from '@/lib/types'
import { formatCurrency, formatDate, calculatePercentage } from '@/lib/utils'
import { Badge, getStatusBadgeVariant, formatStatusLabel } from '@/components/ui/badge'
import Link from 'next/link'
import { MapPin, Calendar, User, ArrowRight, FolderKanban } from 'lucide-react'

interface ProjectCardProps {
  project: Project
  spent?: number
}

const statusBorderColor: Record<string, string> = {
  active: 'border-l-blue-500',
  completed: 'border-l-green-500',
  on_hold: 'border-l-amber-500',
  planning: 'border-l-slate-400',
}

export function ProjectCard({ project, spent = 0 }: ProjectCardProps) {
  const percentage = calculatePercentage(spent, project.budget)

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${statusBorderColor[project.status] || 'border-l-slate-300'} shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 p-6`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <FolderKanban size={20} className="text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 truncate">{project.name}</h3>
        </div>
        <Badge variant={getStatusBadgeVariant(project.status)} className="ml-2 shrink-0">
          {formatStatusLabel(project.status)}
        </Badge>
      </div>

      {project.description && (
        <p className="text-sm text-slate-500 mt-0.5 mb-3 line-clamp-2">{project.description}</p>
      )}

      <div className="space-y-1.5 mb-4">
        {project.client_name && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <User size={12} />
            <span>{project.client_name}</span>
          </div>
        )}
        {project.location && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MapPin size={12} />
            <span>{project.location}</span>
          </div>
        )}
        {project.start_date && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar size={12} />
            <span>{formatDate(project.start_date)} — {project.end_date ? formatDate(project.end_date) : 'Ongoing'}</span>
          </div>
        )}
      </div>

      {/* Budget progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-500">Budget used</span>
          <span className="font-medium text-slate-700">{percentage}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-amber-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1.5">
          <span className="text-slate-400">Spent: {formatCurrency(spent)}</span>
          <span className="text-slate-600 font-medium">Budget: {formatCurrency(project.budget)}</span>
        </div>
      </div>

      <Link
        href={`/projects/${project.id}`}
        className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all"
      >
        View Project <ArrowRight size={14} />
      </Link>
    </div>
  )
}
