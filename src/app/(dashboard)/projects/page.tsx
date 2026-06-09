import { createClient } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/projects/project-card'
import { NewProjectButton } from '@/components/projects/new-project-button'
import { FolderKanban } from 'lucide-react'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const counts = {
    all: projects?.length ?? 0,
    active: projects?.filter(p => p.status === 'active').length ?? 0,
    planning: projects?.filter(p => p.status === 'planning').length ?? 0,
    completed: projects?.filter(p => p.status === 'completed').length ?? 0,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 text-sm mt-1">{counts.all} project{counts.all !== 1 ? 's' : ''} total</p>
        </div>
        <NewProjectButton />
      </div>

      {/* Status filters (display only) */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'All', count: counts.all, color: 'bg-slate-100 text-slate-700' },
          { label: 'Active', count: counts.active, color: 'bg-green-100 text-green-700' },
          { label: 'Planning', count: counts.planning, color: 'bg-blue-100 text-blue-700' },
          { label: 'Completed', count: counts.completed, color: 'bg-slate-100 text-slate-500' },
        ].map(f => (
          <span key={f.label} className={`px-3 py-1.5 rounded-full text-sm font-medium ${f.color}`}>
            {f.label} <span className="ml-1 opacity-70">{f.count}</span>
          </span>
        ))}
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <FolderKanban size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">No projects yet</p>
          <p className="text-sm mt-1">Create your first project to get started</p>
        </div>
      )}
    </div>
  )
}
