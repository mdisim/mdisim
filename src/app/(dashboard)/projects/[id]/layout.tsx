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
    .select('id, name, status')
    .eq('id', id)
    .single()

  if (!project) notFound()

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/projects"
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg font-bold text-slate-900 truncate">{project.name}</h1>
          <StatusBadge status={project.status} />
        </div>
      </div>
      <ProjectTabs projectId={id} />
      {children}
    </div>
  )
}
