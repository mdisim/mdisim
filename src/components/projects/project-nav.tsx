'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Project } from '@/lib/types'
import { ArrowLeft, Ruler, ImageIcon, Settings2, FileSpreadsheet, BookOpen } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateProject } from '@/app/actions/projects'

const TABS = [
  { href: 'measurements', label: 'Measurement Book', icon: Ruler },
  { href: 'drawings', label: 'Drawings', icon: ImageIcon },
  { href: 'boq', label: 'BOQ', icon: FileSpreadsheet },
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
      <div className="bg-white border-b border-slate-200 px-4 md:px-8">
        <div className="flex items-center gap-4 py-4">
          <Link href="/projects" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate">{project.name}</h1>
            <p className="text-xs text-slate-500 truncate">
              {[project.client_name, project.location].filter(Boolean).join(' · ') || 'No details'}
            </p>
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            title="Edit project"
          >
            <Settings2 size={16} />
          </button>
        </div>

        <div className="flex gap-1 -mb-px">
          {TABS.map((tab) => {
            const href = `${base}/${tab.href}`
            const isActive = pathname.startsWith(href)
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                href={href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                )}
              >
                <Icon size={16} />
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Project" size="md">
        <div className="space-y-4">
          <Input label="Project Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Client Name" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
          <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
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
              <option value="NIS">NIS (₪)</option>
              <option value="SAR">SAR</option>
              <option value="AED">AED</option>
              <option value="JOD">JOD</option>
              <option value="EGP">EGP</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
