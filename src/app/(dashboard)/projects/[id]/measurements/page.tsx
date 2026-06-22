'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import {
  getMeasurementItems,
  createMeasurementItem,
  deleteMeasurementItem,
  updateMeasurementItem,
  createMeasurementLine,
  updateMeasurementLine,
  deleteMeasurementLine,
  duplicateMeasurementLine,
} from '@/app/actions/measurements'
import { generateBOQFromMeasurements } from '@/app/actions/boq'
import type { MeasurementItem, MeasurementType } from '@/lib/types'
import { MEASUREMENT_UNITS, MEASUREMENT_TYPES } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { MeasurementGrid } from '@/components/measurements/measurement-grid'
import { MeasurementToolbar } from '@/components/measurements/measurement-toolbar'
import { GenerateBOQDialog } from '@/components/measurements/generate-boq-dialog'
import { Ruler, Plus } from 'lucide-react'

const MEASUREMENT_TYPE_DEFAULT_UNIT: Record<MeasurementType, string> = {
  volume: 'm³',
  area: 'm²',
  length: 'm',
  count: 'nr',
  weight: 'kg',
  formula: 'm',
}

export default function MeasurementsPage() {
  const { id: projectId } = useParams<{ id: string }>()

  const [items, setItems] = useState<MeasurementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [sectionFilter, setSectionFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateItem, setShowCreateItem] = useState(false)
  const [showGenerateBOQ, setShowGenerateBOQ] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [createForm, setCreateForm] = useState({
    item_code: '',
    description: '',
    unit: 'm',
    measurement_type: 'length' as MeasurementType,
    section: '',
    drawing_ref: '',
    location: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getMeasurementItems(projectId)
    setItems(data)
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const handleCreateItem = async () => {
    if (!createForm.description.trim()) return
    setCreating(true)
    setError(null)
    const result = await createMeasurementItem({
      project_id: projectId,
      ...createForm,
    })
    if (result.error) {
      setError(result.error)
      setCreating(false)
      return
    }
    setShowCreateItem(false)
    setCreateForm({
      item_code: '',
      description: '',
      unit: 'm',
      measurement_type: 'length',
      section: '',
      drawing_ref: '',
      location: '',
    })
    setCreating(false)
    load()
  }

  const handleUpdateItem = useCallback(
    async (id: string, fields: Partial<MeasurementItem>) => {
      await updateMeasurementItem(id, fields)
      load()
    },
    [load],
  )

  const handleDeleteItem = useCallback(
    async (id: string) => {
      if (!confirm('Delete this measurement item and all its lines?')) return
      await deleteMeasurementItem(id)
      setSelectedItems((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      load()
    },
    [load],
  )

  const handleAddLine = useCallback(
    async (itemId: string, isDeduction?: boolean) => {
      await createMeasurementLine({
        item_id: itemId,
        nr: 1,
        is_deduction: isDeduction ?? false,
      })
      load()
    },
    [load],
  )

  const handleUpdateLine = useCallback(
    async (id: string, fields: Record<string, unknown>) => {
      await updateMeasurementLine(id, fields)
      load()
    },
    [load],
  )

  const handleDeleteLine = useCallback(
    async (id: string) => {
      await deleteMeasurementLine(id)
      load()
    },
    [load],
  )

  const handleDuplicateLine = useCallback(
    async (id: string) => {
      await duplicateMeasurementLine(id)
      load()
    },
    [load],
  )

  const handleGenerateBOQ = useCallback(
    async (_options: { linkLibrary: boolean; copyRates: boolean }) => {
      const ids = Array.from(selectedItems)
      if (ids.length === 0) return
      await generateBOQFromMeasurements(projectId, ids)
      setShowGenerateBOQ(false)
      setSelectedItems(new Set())
    },
    [projectId, selectedItems],
  )

  const sections = useMemo(() => {
    const set = new Set<string>()
    for (const item of items) {
      if (item.section) set.add(item.section)
    }
    return Array.from(set).sort()
  }, [items])

  const filteredItems = useMemo(() => {
    let result = items
    if (sectionFilter) {
      result = result.filter((item) => item.section === sectionFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.description.toLowerCase().includes(q) ||
          item.item_code?.toLowerCase().includes(q) ||
          item.location?.toLowerCase().includes(q) ||
          item.drawing_ref?.toLowerCase().includes(q),
      )
    }
    return result
  }, [items, sectionFilter, searchQuery])

  const lineCount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.lines?.length ?? 0), 0)
  }, [items])

  const handleMeasurementTypeChange = (type: MeasurementType) => {
    setCreateForm((prev) => ({
      ...prev,
      measurement_type: type,
      unit: MEASUREMENT_TYPE_DEFAULT_UNIT[type] ?? prev.unit,
    }))
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mt-2" />
          </div>
          <div className="h-9 w-24 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse"
            >
              <div className="h-5 bg-slate-200 rounded w-1/2" />
              <div className="h-4 bg-slate-100 rounded w-1/3 mt-2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center py-20">
          <Ruler size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            No measurement items yet
          </h3>
          <p className="text-slate-500 text-sm mb-6">
            Add measurement items to start building your quantity calculation
            book.
          </p>
          <Button onClick={() => setShowCreateItem(true)}>
            <Plus size={16} />
            Add First Item
          </Button>
        </div>
        <CreateItemModal
          isOpen={showCreateItem}
          onClose={() => setShowCreateItem(false)}
          form={createForm}
          setForm={setCreateForm}
          onMeasurementTypeChange={handleMeasurementTypeChange}
          onSubmit={handleCreateItem}
          creating={creating}
          error={error}
          sections={sections}
        />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <MeasurementToolbar
        itemCount={items.length}
        lineCount={lineCount}
        selectedCount={selectedItems.size}
        sections={sections}
        activeSection={sectionFilter}
        onSectionFilter={setSectionFilter}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onAddItem={() => setShowCreateItem(true)}
        onGenerateBOQ={() => setShowGenerateBOQ(true)}
      />

      <MeasurementGrid
        items={filteredItems}
        selectedItems={selectedItems}
        onToggleSelect={(id: string) => {
          setSelectedItems((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
          })
        }}
        onSelectAll={() => {
          setSelectedItems(new Set(filteredItems.map((i) => i.id)))
        }}
        onAddItem={() => setShowCreateItem(true)}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
        onAddLine={handleAddLine}
        onUpdateLine={handleUpdateLine}
        onDeleteLine={handleDeleteLine}
        onDuplicateLine={handleDuplicateLine}
      />

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600">
        <div className="flex items-center gap-4">
          <span>
            <strong className="text-slate-900">{items.length}</strong> item
            {items.length !== 1 ? 's' : ''}
          </span>
          <span className="text-slate-300">|</span>
          <span>
            <strong className="text-slate-900">{lineCount}</strong> line
            {lineCount !== 1 ? 's' : ''}
          </span>
        </div>
        {selectedItems.size > 0 && (
          <span className="text-blue-600 font-medium">
            {selectedItems.size} selected for BOQ
          </span>
        )}
      </div>

      <CreateItemModal
        isOpen={showCreateItem}
        onClose={() => setShowCreateItem(false)}
        form={createForm}
        setForm={setCreateForm}
        onMeasurementTypeChange={handleMeasurementTypeChange}
        onSubmit={handleCreateItem}
        creating={creating}
        error={error}
        sections={sections}
      />

      <GenerateBOQDialog
        isOpen={showGenerateBOQ}
        onClose={() => setShowGenerateBOQ(false)}
        selectedItems={items.filter((item) => selectedItems.has(item.id))}
        onGenerate={handleGenerateBOQ}
      />
    </div>
  )
}

function CreateItemModal({
  isOpen,
  onClose,
  form,
  setForm,
  onMeasurementTypeChange,
  onSubmit,
  creating,
  error,
  sections,
}: {
  isOpen: boolean
  onClose: () => void
  form: {
    item_code: string
    description: string
    unit: string
    measurement_type: MeasurementType
    section: string
    drawing_ref: string
    location: string
  }
  setForm: React.Dispatch<React.SetStateAction<typeof form>>
  onMeasurementTypeChange: (type: MeasurementType) => void
  onSubmit: () => void
  creating: boolean
  error: string | null
  sections: string[]
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Measurement Item" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Item Code"
            value={form.item_code}
            onChange={(e) => setForm((prev) => ({ ...prev, item_code: e.target.value }))}
            placeholder="e.g. 01.01"
          />
          <div className="col-span-2">
            <Input
              label="Description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="e.g. Excavation for foundations"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Measurement Type"
            value={form.measurement_type}
            onChange={(e) =>
              onMeasurementTypeChange(e.target.value as MeasurementType)
            }
            options={MEASUREMENT_TYPES}
          />
          <Select
            label="Unit"
            value={form.unit}
            onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
            options={MEASUREMENT_UNITS}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Section / Category
            </label>
            <input
              type="text"
              list="sections-list"
              value={form.section}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, section: e.target.value }))
              }
              placeholder="e.g. Substructure"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="sections-list">
              {sections.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <Input
            label="Drawing Reference"
            value={form.drawing_ref}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, drawing_ref: e.target.value }))
            }
            placeholder="e.g. S-01"
          />
          <Input
            label="Location / Floor"
            value={form.location}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, location: e.target.value }))
            }
            placeholder="e.g. Ground Floor"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            loading={creating}
            disabled={!form.description.trim()}
          >
            Add Item
          </Button>
        </div>
      </div>
    </Modal>
  )
}
