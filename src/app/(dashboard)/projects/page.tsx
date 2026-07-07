'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getProjects, createProject, deleteProject } from '@/app/actions/projects'
import type { Project } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { FolderKanban, Plus, Trash2, MapPin, User, Calendar, Search, LayoutGrid, List, DollarSign, ArrowRight } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'

export default function ProjectsPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { toast } = useToast()
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
    try {
      setLoading(true)
      setError(null)
      const data = await getProjects()
      setProjects(data)
    } catch (e) {
      const message = e instanceof Error ? e.message : t.projects.failedToLoadProjects
      setError(message)
      toast({ title: t.projects.failedToLoadProjects, description: message, variant: 'danger' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setCreating(true)
    setError(null)
    const result = await createProject(form)
    if (result.error) {
      setError(result.error)
      toast({ title: t.projects.failedToLoadProjects, description: result.error, variant: 'danger' })
      setCreating(false)
      return
    }
    setShowCreate(false)
    setForm({ name: '', client_name: '', location: '', currency: 'USD', description: '' })
    setCreating(false)
    toast({ title: t.projects.projectCreated, variant: 'success' })
    loadProjects()
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmAction({
      message: t.projects.deleteProjectConfirm,
      onConfirm: async () => {
        try {
          await deleteProject(id)
          toast({ title: t.projects.projectDeleted, variant: 'success' })
          loadProjects()
        } catch {
          setError(t.projects.failedToDeleteProject)
          toast({ title: t.projects.failedToDeleteProject, variant: 'danger' })
        }
      },
    })
  }

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.client_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // Category-tag tokens, cycled per card so a project list reads like the
  // same tagging system used for measurements elsewhere in the product.
  const ACCENT_COLORS = [
    'var(--color-tag-1)',
    'var(--color-tag-2)',
    'var(--color-tag-3)',
    'var(--color-tag-4)',
    'var(--color-tag-5)',
  ]

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--color-amber)]/10 border border-[var(--color-amber)]/20">
              <FolderKanban size={20} className="text-[var(--color-amber)]" />
            </div>
            <div>
              <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[var(--foreground)] leading-tight">{t.projects.title}</h1>
              <p className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-[0.12em] font-mono mt-0.5">
                {projects.length} {projects.length === 1 ? 'project' : 'projects'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
              <button
                onClick={() => setView('grid')}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  view === 'grid'
                    ? 'bg-[var(--color-brand)] text-white'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--foreground)]'
                )}
                title={t.dashboard.gridView}
                aria-label={t.dashboard.gridView}
                aria-selected={view === 'grid'}
                role="tab"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setView('list')}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  view === 'list'
                    ? 'bg-[var(--color-brand)] text-white'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--foreground)]'
                )}
                title={t.dashboard.listView}
                aria-label={t.dashboard.listView}
                aria-selected={view === 'list'}
                role="tab"
              >
                <List size={16} />
              </button>
            </div>
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} />
              {t.projects.createProject}
            </Button>
          </div>
        </div>

        {/* ── Search ── */}
        {projects.length > 0 && (
          <div className="relative mb-6 max-w-md">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.projects.searchPlaceholder}
              className="w-full ps-10 pe-4 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--foreground)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)]/30 focus:border-[var(--color-amber)]/50 transition-all"
            />
          </div>
        )}

        {/* ── Loading ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden animate-pulse">
                <div className="h-1 bg-[var(--color-amber)]/20" />
                <div className="p-6">
                  <div className="h-5 bg-[var(--color-surface-elevated)] rounded w-3/4 mb-3" />
                  <div className="h-4 bg-[var(--color-surface-elevated)] rounded w-1/2 mb-2" />
                  <div className="h-4 bg-[var(--color-surface-elevated)] rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* ── Empty state ── */
          <div className="text-center py-20">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center mb-6">
              <FolderKanban size={36} className="text-[var(--color-text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              {search ? t.projects.noMatchingProjects : t.projects.noProjects}
            </h3>
            <p className="text-[var(--color-text-muted)] text-sm mb-8 max-w-sm mx-auto">
              {search ? t.projects.tryAdjustingSearch : t.projects.noProjectsDescLong}
            </p>
            {!search && (
              <Button onClick={() => setShowCreate(true)}>
                <Plus size={16} />
                {t.projects.createProject}
              </Button>
            )}
          </div>
        ) : view === 'grid' ? (
          /* ── Grid view ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((project, idx) => {
              const accentColor = ACCENT_COLORS[idx % ACCENT_COLORS.length]
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.05, ease: 'easeOut' }}
                  onClick={() => router.push(`/projects/${project.id}/workspace`)}
                  className="group relative bg-[var(--color-surface-elevated)] rounded-2xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-brand)]/30 transition-all duration-300 cursor-pointer hover:bg-[var(--color-surface-hover)]"
                >
                  {/* Top amber accent line */}
                  <div className="h-[2px] w-full" style={{ background: accentColor }} />

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}
                      >
                        <FolderKanban size={18} style={{ color: accentColor }} />
                      </div>
                      <button
                        onClick={(e) => handleDelete(project.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[var(--color-danger-tint)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all"
                        title={t.projects.deleteProjectTitle}
                        aria-label={t.projects.deleteProjectTitle}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <h3 className="font-semibold text-[var(--foreground)] text-base mb-2 truncate">{project.name}</h3>

                    <div className="space-y-1.5 mb-4">
                      {project.client_name && (
                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                          <User size={12} className="shrink-0" />
                          <span className="truncate">{project.client_name}</span>
                        </div>
                      )}
                      {project.location && (
                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                          <MapPin size={12} className="shrink-0" />
                          <span className="truncate">{project.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                        <Calendar size={12} />
                        <span>{formatDate(project.updated_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md"
                          style={{ background: `${accentColor}15`, color: accentColor }}
                        >
                          <DollarSign size={9} />
                          {project.currency}
                        </span>
                        <ArrowRight
                          size={14}
                          className="text-[var(--color-text-muted)] group-hover:translate-x-0.5 group-hover:text-[var(--color-amber)] transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          /* ── List view ── */
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
            {filtered.map((project, idx) => {
              const accentColor = ACCENT_COLORS[idx % ACCENT_COLORS.length]
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.03 }}
                  onClick={() => router.push(`/projects/${project.id}/workspace`)}
                  className={cn(
                    'flex items-center gap-4 px-5 py-4 cursor-pointer group transition-colors hover:bg-[var(--color-amber)]/5 border-b border-[var(--color-border)] last:border-0',
                    idx % 2 !== 0 && 'bg-[var(--color-surface-elevated)]'
                  )}
                >
                  <div className="w-1 h-10 rounded-full shrink-0" style={{ background: accentColor }} />
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}25` }}
                  >
                    <FolderKanban size={16} style={{ color: accentColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-[var(--foreground)] truncate group-hover:text-[var(--color-amber)] transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">
                      {[project.client_name, project.location].filter(Boolean).join(' · ') || t.projects.noDetails}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 shrink-0 text-xs text-[var(--color-text-muted)]">
                    <span
                      className="font-bold px-2 py-0.5 rounded-md text-[10px]"
                      style={{ background: `${accentColor}15`, color: accentColor }}
                    >
                      {project.currency}
                    </span>
                    <span>{formatDate(project.updated_at)}</span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(project.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[var(--color-danger-tint)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all shrink-0"
                    title={t.projects.deleteProjectTitle}
                    aria-label={t.projects.deleteProjectTitle}
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* ── Create modal ── */}
        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t.projects.newProjectTitle} size="md">
          <div className="space-y-4">
            <Input
              label={t.projects.projectName}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t.projects.projectNamePlaceholder}
              required
            />
            <Input
              label={t.projects.clientName}
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              placeholder={t.projects.clientNamePlaceholder}
            />
            <Input
              label={t.projects.location}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder={t.projects.locationPlaceholder}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">{t.projects.currency}</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)]/30 focus:border-[var(--color-amber)]/50"
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
              <label className="text-sm font-medium text-[var(--foreground)]">{t.projects.description}</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t.projects.descriptionPlaceholder}
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--foreground)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)]/30 focus:border-[var(--color-amber)]/50 resize-none"
              />
            </div>

            {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>{t.projects.cancel}</Button>
              <Button onClick={handleCreate} loading={creating} disabled={!form.name.trim()}>
                {t.projects.createProject}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={t.projects.confirmTitle} size="sm">
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">{confirmAction?.message}</p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>{t.projects.cancel}</Button>
            <Button variant="danger" onClick={() => { confirmAction?.onConfirm(); setConfirmAction(null) }}>{t.projects.confirm}</Button>
          </div>
        </Modal>
      </div>
    </div>
  )
}
