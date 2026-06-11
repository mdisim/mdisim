'use client'

import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { addLibraryItem, deleteLibraryItem } from '@/app/actions/boq-library'
import { Plus, Search, Trash2, Globe, Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface LibraryItem {
  id: string
  item_code: string
  description: string
  description_en?: string | null
  description_he?: string | null
  description_ar?: string | null
  unit: string
  unit_rate: number
  typical_rate_ils?: number | null
  category?: string | null
  trade?: string | null
  is_global?: boolean
  section_code?: string | null
  netivei_code?: string | null
}

interface Props {
  items: LibraryItem[]
}

export function BOQLibraryClient({ items }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const categories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category).filter(Boolean) as string[])
    return Array.from(cats).sort()
  }, [items])

  const sections = useMemo(() => {
    const secs = new Set(items.map((i) => i.section_code).filter(Boolean) as string[])
    return Array.from(secs).sort()
  }, [items])

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const s = search.toLowerCase()
      const matchSearch =
        !search ||
        item.description.toLowerCase().includes(s) ||
        item.item_code.toLowerCase().includes(s) ||
        (item.category ?? '').toLowerCase().includes(s) ||
        (item.description_en ?? '').toLowerCase().includes(s) ||
        (item.description_he ?? '').toLowerCase().includes(s) ||
        (item.description_ar ?? '').toLowerCase().includes(s)
      const matchCat = !categoryFilter || item.category === categoryFilter
      const matchSection = !sectionFilter || item.section_code === sectionFilter
      return matchSearch && matchCat && matchSection
    })
  }, [items, search, categoryFilter, sectionFilter])

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const result = await addLibraryItem(fd)
    setSaving(false)
    if (result.error) {
      setError(result.error)
    } else {
      setShowAdd(false)
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this item from the library?')) return
    await deleteLibraryItem(id)
    router.refresh()
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search in English, Hebrew, Arabic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">All Sections</option>
          {sections.map((s) => (
            <option key={s} value={s}>Section {s}</option>
          ))}
        </select>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          Add to Library
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Code</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Unit</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Rate ₪</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Section</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Trade</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Source</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                  {items.length === 0 ? 'No library items yet. Add your first item or seed global items.' : 'No items match your filters.'}
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const primaryDesc = item.description_he || item.description_en || item.description
                const secondaryDesc = item.description_en && item.description_he
                  ? item.description_en
                  : (item.description_en || item.description_he ? item.description : null)
                const displayRate = item.typical_rate_ils ?? item.unit_rate
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.item_code}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-900">{primaryDesc}</div>
                      {secondaryDesc && primaryDesc !== secondaryDesc && (
                        <div className="text-slate-400 text-xs mt-0.5">{secondaryDesc}</div>
                      )}
                      {item.description_ar && (
                        <div className="text-slate-400 text-xs mt-0.5 text-right" dir="rtl">{item.description_ar}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.unit}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {displayRate != null ? `₪${Number(displayRate).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {item.category && (
                        <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs text-slate-600">{item.category}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.section_code && (
                        <span className="px-2 py-0.5 bg-blue-100 rounded-full text-xs text-blue-700 font-mono">{item.section_code}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{item.trade ?? '—'}</td>
                    <td className="px-4 py-3">
                      {item.is_global ? (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
                          <Globe size={12} /> Netivei Standard
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <Building2 size={12} /> Company
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!item.is_global && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
            Showing {filtered.length} of {items.length} items
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Library Item" size="lg">
        <form onSubmit={handleAdd} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Item Code *</label>
              <input name="item_code" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit *</label>
              <input name="unit" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
            <input name="description" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit Rate (₪)</label>
              <input name="unit_rate" type="number" step="0.01" min="0" defaultValue="0" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input name="category" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Trade</label>
              <input name="trade" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add Item'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
