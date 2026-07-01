'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Project } from '@/lib/types'
import { ArrowLeft, Ruler, ImageIcon, Settings2, FileSpreadsheet, BookOpen, Calculator, Users, DollarSign, Receipt, GitCompare, BarChart3, Activity, FileBarChart, TrendingUp, LayoutPanelLeft } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateProject } from '@/app/actions/projects'

const TABS = [
  { href: 'workspace', label: 'Workspace', icon: LayoutPanelLeft },
  { href: '', label: 'Intelligence', icon: Activity },
  { href: 'measurements', label: 'Measurements', icon: Ruler },
  { href: 'drawings', label: 'Drawings', icon: ImageIcon },
  { href: 'boq', label: 'BOQ', icon: FileSpreadsheet },
  { href: 'rates', label: 'Rates', icon: Calculator },
  { href: 'quantities', label: 'Quantities', icon: BarChart3 },
  { href: 'revisions', label: 'Revisions', icon: GitCompare },
  { href: 'tenders', label: 'Tenders', icon: Users },
  { href: 'cost-control', label: 'Cost Control', icon: DollarSign },
  { href: 'evm', label: 'EVM', icon: TrendingUp },
  { href: 'payments', label: 'Payments', icon: Receipt },
  { href: 'library', label: 'Library', icon: BookOpen },
  { href: 'reports', label: 'Reports', icon: FileBarChart },
]

export function ProjectNav({ project }: { project: Project }) {
  const pathname = usePathname()
  const router = useRouter()
  const base = `/projects/${project.id}`
  const [showEdit, setShowEdit] = useState(false)
  const [form, setForm] = useState({
    name: project.name,
    client_name: project.client_name ?? '',
    location: project.location ?? '',
    currency: project.currency,
    description: project.description ?? '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await updateProject(project.id, form)
    setSaving(false)
    setShowEdit(false)
    router.refresh()
  }

  return (
    <>
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 md:px-8">
        {/* Project header */}
        <div className="flex items-center gap-4 py-4">
          <Link
            href="/projects"
            className="p-2 rounded-xl hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[var(--color-text)] truncate">{project.name}</h1>
            <p className="text-xs text-[var(--color-text-muted)] truncate">
              {[project.client_name, project.location].filter(Boolean).join(' · ') || 'No details'}
            </p>
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="p-2 rounded-xl hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] transition-colors"
            title="Edit project"
            aria-label="Edit project settings"
          >
            <Settings2 size={16} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0.5 -mb-px overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const href = tab.href ? `${base}/${tab.href}` : base
            const isActive = tab.href ? pathname.startsWith(href) : pathname === base
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap',
                  'md:px-4 md:text-sm md:gap-2',
                  isActive
                    ? 'border-[var(--color-amber)] text-[var(--color-amber)] font-bold bg-[var(--color-amber)]/5'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border)]'
                )}
              >
                <Icon size={14} className="md:w-4 md:h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Edit modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Project" size="md">
        <div className="space-y-4">
          <Input label="Project Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Client Name" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
          <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Currency</label>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)]/40 focus:border-[var(--color-amber)] transition-all"
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
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)]/40 focus:border-[var(--color-amber)] transition-all resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
