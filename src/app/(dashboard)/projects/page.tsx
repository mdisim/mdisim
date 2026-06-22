'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getProjects, createProject, deleteProject } from '@/app/actions/projects'
import type { Project } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { FolderKanban, Plus, Trash2, MapPin, User, Calendar, Search } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    client_name: '',
    location: '',
    currency: 'USD',
    vat_pct: 0,
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
    setForm({ name: '', client_name: '', location: '', currency: 'USD', vat_pct: 0, description: '' })
    setCreating(false)
    loadProjects()
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this project and all its data?')) return
    await deleteProject(id)
    loadProjects()
  }

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.client_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 text-sm mt-1">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New Project
        </Button>
      </div>

      {/* Search */}
      {projects.length > 0 && (
        <div className="relative mb-6 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Project grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-slate-100 rounded w-1/2 mb-2" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FolderKanban size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            {search ? 'No matching projects' : 'No projects yet'}
          </h3>
          <p className="text-slate-500 text-sm mb-6">
            {search ? 'Try a different search term.' : 'Create your first project to get started.'}
          </p>
          {!search && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} />
              Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <div
              key={project.id}
              onClick={() => router.push(`/projects/${project.id}/measurements`)}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group relative"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <FolderKanban size={20} className="text-blue-600" />
                </div>
                <button
                  onClick={(e) => handleDelete(project.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                  title="Delete project"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <h3 className="font-semibold text-slate-900 mb-1 truncate">{project.name}</h3>

              {project.client_name && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <User size={12} />
                  <span className="truncate">{project.client_name}</span>
                </div>
              )}
              {project.location && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <MapPin size={12} />
                  <span className="truncate">{project.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                <Calendar size={12} />
                <span>{formatDate(project.updated_at)}</span>
                <span className="ml-auto text-xs font-medium text-slate-500">{project.currency}</span>
              </div>
            </div>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="ILS">ILS (₪)</option>
                <option value="SAR">SAR</option>
                <option value="AED">AED</option>
                <option value="JOD">JOD</option>
                <option value="EGP">EGP</option>
              </select>
            </div>
            <Input
              label="VAT %"
              type="number"
              value={String(form.vat_pct)}
              onChange={(e) => setForm({ ...form, vat_pct: parseFloat(e.target.value) || 0 })}
              placeholder="17"
              min="0"
              max="100"
              step="0.5"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional project description..."
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating} disabled={!form.name.trim()}>
              Create Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
