import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ProjectTabs } from './project-tabs'
import { StatusBadge } from '@/components/ui/badge'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, status, client_name')
    .eq('id', id)
    .single()

  if (!project) notFound()

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Project header */}
      <div className="flex items-center gap-4 mb-1">
        <Link
          href="/projects"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 truncate">{project.name}</h1>
            {project.client_name && (
              <p className="text-sm text-slate-500 mt-0.5">{project.client_name}</p>
            )}
          </div>
          <StatusBadge status={project.status} />
        </div>
      </div>

      <ProjectTabs projectId={id} />

      {children}
    </div>
  )
}
