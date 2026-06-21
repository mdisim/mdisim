'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { getTemplates, loadTemplate, saveAsTemplate, deleteTemplate } from '@/app/actions/boq-templates'
import { Save, FolderOpen, Trash2, Building2, User, Search, FileText } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/use-translation'

interface Template {
  id: string
  name: string
  description: string | null
  category: string | null
  is_company_standard: boolean
  created_at: string
  item_count?: number
}

interface SaveTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectName: string
}

export function SaveTemplateModal({ isOpen, onClose, projectId, projectName }: SaveTemplateModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(projectName + ' Template')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [isCompanyStandard, setIsCompanyStandard] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    const result = await saveAsTemplate({
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      is_company_standard: isCompanyStandard,
      projectId,
    })
    setSaving(false)
    if (result.error) {
      setError(result.error)
    } else {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('save_as_template', 'Save as Template')} size="md">
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">{t('template_name', 'Template Name')} *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">{t('description', 'Description')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">{t('category', 'Category')}</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Residential, Commercial, Infrastructure"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isCompanyStandard}
            onChange={(e) => setIsCompanyStandard(e.target.checked)}
            className="rounded border-slate-300"
          />
          <Building2 size={14} />
          {t('company_standard', 'Make this a company standard template')}
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
            {t('cancel', 'Cancel')}
          </button>
          <Button onClick={() => void handleSave()} disabled={saving || !name.trim()}>
            <Save size={14} />
            {saving ? t('saving', 'Saving...') : t('save', 'Save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

interface LoadTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onLoaded: () => void
}

export function LoadTemplateModal({ isOpen, onClose, projectId, onLoaded }: LoadTemplateModalProps) {
  const { t } = useTranslation()
  const [templates, setTemplates] = useState<Template[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    getTemplates(search || undefined).then((result) => {
      if (result.error) setError(result.error)
      else setTemplates(result.data as Template[])
      setLoading(false)
    })
  }, [isOpen, search])

  async function handleLoad(templateId: string) {
    setImporting(templateId)
    setError('')
    const result = await loadTemplate(templateId, projectId)
    setImporting(null)
    if (result.error) {
      setError(result.error)
    } else {
      onLoaded()
      onClose()
    }
  }

  async function handleDelete(templateId: string) {
    if (!confirm(t('delete_confirm', 'Delete this template?'))) return
    const result = await deleteTemplate(templateId)
    if (result.error) {
      setError(result.error)
    } else {
      setTemplates((prev) => prev.filter((t) => t.id !== templateId))
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('load_template', 'Load Template')} size="lg">
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>}

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('search_templates', 'Search templates...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">{t('loading', 'Loading...')}</div>
        ) : templates.length === 0 ? (
          <div className="py-12 text-center">
            <FileText size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">{t('no_templates', 'No templates found')}</p>
            <p className="text-slate-400 text-xs mt-1">{t('save_template_hint', 'Save a BOQ as template from any project')}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 text-sm truncate">{tmpl.name}</span>
                    {tmpl.is_company_standard && (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        <Building2 size={10} /> Standard
                      </span>
                    )}
                    {!tmpl.is_company_standard && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        <User size={10} /> Personal
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {tmpl.description && <span className="text-xs text-slate-500 truncate">{tmpl.description}</span>}
                    {tmpl.category && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{tmpl.category}</span>}
                    <span className="text-xs text-slate-400">{new Date(tmpl.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <button
                    onClick={() => void handleLoad(tmpl.id)}
                    disabled={importing !== null}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {importing === tmpl.id ? t('loading', 'Loading...') : t('load', 'Load')}
                  </button>
                  <button
                    onClick={() => void handleDelete(tmpl.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
