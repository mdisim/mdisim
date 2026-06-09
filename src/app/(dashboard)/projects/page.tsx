import { createClient } from '@/lib/supabase/server'
import { NewProjectButton } from '@/components/projects/new-project-button'
import { SearchableProjectsList } from '@/components/projects/searchable-projects-list'
import { Project } from '@/lib/types'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('created_by', user!.id)
    .order('created_at', { ascending: false })

  const typedProjects = (projects ?? []) as Project[]

  const counts = {
    all: typedProjects.length,
    active: typedProjects.filter(p => p.status === 'active').length,
    planning: typedProjects.filter(p => p.status === 'planning').length,
    completed: typedProjects.filter(p => p.status === 'completed').length,
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

      {/* Status summary badges */}
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

      <SearchableProjectsList projects={typedProjects} />
    </div>
  )
}
