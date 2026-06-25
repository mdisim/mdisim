'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getProjects, createProject, deleteProject } from '@/app/actions/projects'
import type { Project } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { FolderKanban, Plus, Trash2, MapPin, User, Calendar, Search, LayoutGrid, List, DollarSign } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const [form, setForm] = useState({
    name: '',
    client_name: '',
    location: '',
    currency: 'USD',
    description: '',
  })

  const loadProjects = useCallback(async () => {
    setLoading(true)
    const data = await getProjects()
    setProjects(data)
    setLoading(false)
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setCreating(true)
    setError(null)
    const result = await createProject(form)
    if (result.error) {
      setError(result.error)
      setCreating(false)
      return
    }
    setShowCreate(false)
    setForm({ name: '', client_name: '', location: '', currency: 'USD', description: '' })
    setCreating(false)
    loadProjects()
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmAction({
      message: 'Delete this project and all its data?',
      onConfirm: async () => {
        await deleteProject(id)
        loadProjects()
      },
    })
  }

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.client_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const GRADIENT_ACCENTS = [
    'from-blue-500 to-cyan-400',
    'from-violet-500 to-purple-400',
    'from-emerald-500 to-teal-400',
    'from-orange-500 to-amber-400',
    'from-pink-500 to-rose-400',
    'from-indigo-500 to-blue-400',
  ]

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Projects</h1>
          <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            {projects.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5">
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
              title="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            New Project
          </Button>
        </div>
      </div>

      {/* Search */}
      {projects.length > 0 && (
        <div className="relative mb-6 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
          />
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-hidden animate-pulse">
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700" />
              <div className="p-6">
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
                <div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded w-1/2 mb-2" />
                <div className="h-4 bg-slate-100 dark:bg-slate-700/60 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="text-center py-20">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
            <FolderKanban size={36} className="text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
            {search ? 'No matching projects' : 'No projects yet'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 max-w-sm mx-auto">
            {search
              ? 'Try adjusting your search terms or clear the filter to see all projects.'
              : 'Get started by creating your first project. Organize measurements, drawings, and bills of quantities all in one place.'}
          </p>
          {!search && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} />
              Create Project
            </Button>
          )}
        </div>
      ) : view === 'grid' ? (
        /* Grid view */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project, idx) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.05, ease: 'easeOut' }}
              onClick={() => router.push(`/projects/${project.id}/measurements`)}
              className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-hidden hover:border-blue-300 dark:hover:border-blue-600/50 hover:shadow-lg hover:shadow-blue-500/5 dark:hover:shadow-blue-500/10 transition-all duration-200 cursor-pointer group"
            >
              {/* Gradient accent strip */}
              <div className={`h-1.5 bg-gradient-to-r ${GRADIENT_ACCENTS[idx % GRADIENT_ACCENTS.length]}`} />

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                    <FolderKanban size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <button
                    onClick={(e) => handleDelete(project.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-all"
                    title="Delete project"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <h3 className="font-semibold text-slate-900 dark:text-white mb-2 truncate">{project.name}</h3>

                <div className="space-y-1.5 mb-4">
                  {project.client_name && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <User size={12} className="shrink-0" />
                      <span className="truncate">{project.client_name}</span>
                    </div>
                  )}
                  {project.location && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin size={12} className="shrink-0" />
                      <span className="truncate">{project.location}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                    <Calendar size={12} />
                    <span>{formatDate(project.updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-2 py-0.5 rounded-md">
                    <DollarSign size={10} />
                    {project.currency}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* List view */
        <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/60">
          {filtered.map((project, idx) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.03 }}
              onClick={() => router.push(`/projects/${project.id}/measurements`)}
              className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group"
            >
              <div className={`w-1 h-10 rounded-full bg-gradient-to-b ${GRADIENT_ACCENTS[idx % GRADIENT_ACCENTS.length]} shrink-0`} />
              <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
                <FolderKanban size={16} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">{project.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {[project.client_name, project.location].filter(Boolean).join(' · ') || 'No details'}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-4 shrink-0 text-xs text-slate-400 dark:text-slate-500">
                <span className="font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-2 py-0.5 rounded-md">{project.currency}</span>
                <span>{formatDate(project.updated_at)}</span>
              </div>
              <button
                onClick={(e) => handleDelete(project.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-all shrink-0"
                title="Delete project"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Project" size="md">
        <div className="space-y-4">
          <Input
            label="Project Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Villa Al-Noor"
            required
          />
          <Input
            label="Client Name"
            value={form.client_name}
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
            placeholder="e.g. Ahmad Construction Ltd"
          />
          <Input
            label="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="e.g. Riyadh, KSA"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Currency</label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="NIS">NIS (&#8362;)</option>
              <option value="SAR">SAR</option>
              <option value="AED">AED</option>
              <option value="JOD">JOD</option>
              <option value="EGP">EGP</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional project description..."
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating} disabled={!form.name.trim()}>
              Create Project
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title="Confirm" size="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{confirmAction?.message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => { confirmAction?.onConfirm(); setConfirmAction(null) }}>Confirm</Button>
        </div>
      </Modal>
    </div>
  )
}
