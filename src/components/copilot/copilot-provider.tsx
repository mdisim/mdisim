'use client'

import { usePathname } from 'next/navigation'
import { CopilotChat } from './copilot-chat'

interface CopilotProviderProps {
  projects: { id: string; name: string }[]
}

export function CopilotProvider({ projects }: CopilotProviderProps) {
  const pathname = usePathname()

  const match = pathname.match(/\/projects\/([^/]+)/)
  const projectId = match?.[1]
  const project = projects.find(p => p.id === projectId)

  if (!projectId || !project) return null

  return (
    <CopilotChat
      key={projectId}
      projectId={projectId}
      projectName={project.name}
      currentPage={pathname}
    />
  )
}
