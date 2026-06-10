import Link from 'next/link'
import { FolderKanban } from 'lucide-react'

export default function ProjectNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <FolderKanban size={36} className="text-slate-400" />
      </div>
      <h1 className="text-2xl font-bold text-[#1e3a5f] mb-2">Project Not Found</h1>
      <p className="text-slate-500 mb-8 max-w-sm">
        The project you are looking for does not exist or you do not have permission to view it.
      </p>
      <Link
        href="/projects"
        className="px-5 py-2.5 bg-[#1e3a5f] text-white font-medium rounded-lg hover:bg-[#2d5282] transition-colors"
      >
        Back to Projects
      </Link>
    </div>
  )
}
