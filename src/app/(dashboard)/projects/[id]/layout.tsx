import { redirect } from 'next/navigation'
import { getProject } from '@/app/actions/projects'
import { ProjectNav } from '@/components/projects/project-nav'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) redirect('/projects')

  return (
    <div className="flex flex-col h-full">
      <ProjectNav project={project} />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
