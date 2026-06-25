'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Project } from '@/lib/types'
import { ArrowLeft, Ruler, ImageIcon, Settings2, FileSpreadsheet, BookOpen, Calculator, Users, DollarSign, Receipt, GitCompare, BarChart3 } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateProject } from '@/app/actions/projects'

const TABS = [
  { href: 'measurements', label: 'Measurements', icon: Ruler },
  { href: 'drawings', label: 'Drawings', icon: ImageIcon },
  { href: 'boq', label: 'BOQ', icon: FileSpreadsheet },
  { href: 'rates', label: 'Rates', icon: Calculator },
  { href: 'quantities', label: 'Quantities', icon: BarChart3 },
  { href: 'revisions', label: 'Revisions', icon: GitCompare },
  { href: 'tenders', label: 'Tenders', icon: Users },
  { href: 'cost-control', label: 'Cost Control', icon: DollarSign },
  { href: 'payments', label: 'Payments', icon: Receipt },
  { href: 'library', label: 'Library', icon: BookOpen },
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
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700/60 px-4 md:px-8">
        {/* Project header */}
        <div className="flex items-center gap-4 py-4">
          <Link
            href="/projects"
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">{project.name}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {[project.client_name, project.location].filter(Boolean).join(' · ') || 'No details'}
            </p>
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            title="Edit project"
          >
            <Settings2 size={16} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0.5 -mb-px overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const href = `${base}/${tab.href}`
            const isActive = pathname.startsWith(href)
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap',
                  'md:px-4 md:text-sm md:gap-2',
                  isActive
                    ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-900/10'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
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
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 resize-none"
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
