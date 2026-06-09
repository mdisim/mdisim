'use client'

import { useState } from 'react'
import { Project } from '@/lib/types'
import { ProjectCard } from './project-card'
import { FolderKanban, Search } from 'lucide-react'

interface SearchableProjectsListProps {
  projects: Project[]
}

export function SearchableProjectsList({ projects }: SearchableProjectsListProps) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? projects.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.client_name ?? '').toLowerCase().includes(query.toLowerCase()) ||
        (p.location ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : projects

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects by name, client, or location..."
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <FolderKanban size={48} className="mb-4 opacity-30" />
          {query ? (
            <>
              <p className="text-lg font-medium">No results found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium">No projects yet</p>
              <p className="text-sm mt-1">Create your first project to get started</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
