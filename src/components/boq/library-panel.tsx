'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Search, Star, ChevronDown, ChevronRight, Plus, GripVertical } from 'lucide-react'

export interface LibraryItem {
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

interface LibraryPanelProps {
  projectId: string
  items: LibraryItem[]
  onInsertItem: (item: LibraryItem) => void
}

const FAVORITES_KEY = 'boq_library_favorites'
const RECENT_KEY = 'boq_library_recent'

function getDesc(item: LibraryItem): string {
  return item.description_en || item.description_he || item.description || ''
}

function ItemRow({
  item,
  isFavorite,
  onToggleFavorite,
  onInsert,
}: {
  item: LibraryItem
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
  onInsert: (item: LibraryItem) => void
}) {
  const rate = item.typical_rate_ils ?? item.unit_rate ?? 0

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/json', JSON.stringify(item))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group flex items-center gap-1.5 px-2 py-2 rounded-lg hover:bg-blue-50/60 cursor-grab active:cursor-grabbing text-sm border border-transparent hover:border-blue-100 transition-colors"
    >
      <GripVertical size={12} className="text-slate-300 shrink-0 group-hover:text-slate-400" />
      <button
        onClick={() => onToggleFavorite(item.id)}
        className="shrink-0 text-slate-300 hover:text-blue-500 transition-colors"
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star size={12} fill={isFavorite ? 'currentColor' : 'none'} className={isFavorite ? 'text-blue-500' : ''} />
      </button>
      <span className="text-slate-400 font-mono text-xs shrink-0 min-w-[60px]">{item.item_code}</span>
      <span className="flex-1 truncate text-slate-700 text-xs">{getDesc(item)}</span>
      <span className="shrink-0 text-slate-400 text-xs">{item.unit}</span>
      <span className="shrink-0 text-slate-600 text-xs font-medium min-w-[48px] text-right tabular-nums">{'₪'}{rate}</span>
      <button
        onClick={() => onInsert(item)}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1 w-6 h-6 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
        title="Add to BOQ"
      >
        <Plus size={10} />
      </button>
    </div>
  )
}

interface CategoryGroupProps {
  category: string
  items: LibraryItem[]
  favorites: Set<string>
  onToggleFavorite: (id: string) => void
  onInsert: (item: LibraryItem) => void
}

function CategoryGroup({ category, items, favorites, onToggleFavorite, onInsert }: CategoryGroupProps) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div>
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
      >
        {expanded ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
        {category || 'Uncategorized'}
        <span className="ml-auto font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full text-[10px]">{items.length}</span>
      </button>
      {expanded && (
        <div className="ml-1">
          {items.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              isFavorite={favorites.has(item.id)}
              onToggleFavorite={onToggleFavorite}
              onInsert={onInsert}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function LibraryPanel({ projectId: _projectId, items, onInsertItem }: LibraryPanelProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [recent, setRecent] = useState<LibraryItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY)
      if (raw) setFavorites(new Set(JSON.parse(raw) as string[]))
    } catch { /* ignore */ }
    try {
      const raw = localStorage.getItem(RECENT_KEY)
      if (raw) setRecent(JSON.parse(raw) as LibraryItem[])
    } catch { /* ignore */ }
  }, [])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(next))) } catch { /* ignore */ }
      return next
    })
  }, [])

  const handleInsert = useCallback((item: LibraryItem) => {
    setRecent(prev => {
      const filtered = prev.filter(r => r.id !== item.id)
      const next = [item, ...filtered].slice(0, 10)
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
    onInsertItem(item)
  }, [onInsertItem])

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return items.filter(item => {
      const matchSearch = !search ||
        item.item_code.toLowerCase().includes(s) ||
        (item.description_en ?? '').toLowerCase().includes(s) ||
        (item.description_he ?? '').toLowerCase().includes(s) ||
        (item.description_ar ?? '').toLowerCase().includes(s) ||
        item.description.toLowerCase().includes(s) ||
        (item.category ?? '').toLowerCase().includes(s)
      const matchCat = !categoryFilter || item.category === categoryFilter
      return matchSearch && matchCat
    })
  }, [items, search, categoryFilter])

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category ?? 'Uncategorized'))
    return Array.from(cats).sort()
  }, [items])

  const grouped = useMemo(() => {
    const map = new Map<string, LibraryItem[]>()
    for (const item of filtered) {
      const cat = item.category ?? 'Uncategorized'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(item)
    }
    return map
  }, [filtered])

  const favoriteItems = useMemo(() => items.filter(i => favorites.has(i.id)), [items, favorites])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white border-l border-slate-200">
      {/* Header */}
      <div className="shrink-0 px-3 py-3 border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm">
        <div className="text-sm font-bold text-slate-800 mb-2">BOQ Library</div>
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm placeholder:text-slate-400 transition-shadow"
          />
        </div>
        {/* Category filter pills */}
        {categories.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${!categoryFilter ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(p => p === cat ? null : cat)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${categoryFilter === cat ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-1.5 py-2 space-y-1">
        {/* Favorites */}
        {favoriteItems.length > 0 && !search && !categoryFilter && (
          <CategoryGroup
            category="Favorites"
            items={favoriteItems}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onInsert={handleInsert}
          />
        )}

        {/* Recently used */}
        {recent.length > 0 && !search && !categoryFilter && (
          <CategoryGroup
            category="Recently Used"
            items={recent}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onInsert={handleInsert}
          />
        )}

        {/* Main grouped items */}
        {Array.from(grouped.entries()).map(([cat, catItems]) => (
          <CategoryGroup
            key={cat}
            category={cat}
            items={catItems}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onInsert={handleInsert}
          />
        ))}

        {filtered.length === 0 && (
          <div className="text-center text-slate-400 text-xs py-12">No items found</div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-3 py-2 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-400">
        {filtered.length} of {items.length} items · {'₪'}{filtered.reduce((sum, item) => sum + (item.typical_rate_ils ?? item.unit_rate ?? 0), 0).toLocaleString()} total · Drag to BOQ
      </div>
    </div>
  )
}
