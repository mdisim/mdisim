'use client'

import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  FileSpreadsheet,
  Ruler,
  ImageIcon,
  Calculator,
  BarChart3,
  GitCompare,
  Users,
  DollarSign,
  Receipt,
  BookOpen,
  FileBarChart,
  TrendingUp,
  Activity,
  Command,
  ArrowRight,
  Keyboard,
  Moon,
  Sun,
} from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  action: () => void
  category: string
  keywords?: string[]
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  const projectMatch = pathname.match(/\/projects\/([^/]+)/)
  const projectId = projectMatch?.[1]

  const toggleDarkMode = useCallback(() => {
    document.documentElement.classList.toggle('dark')
    const isDark = document.documentElement.classList.contains('dark')
    localStorage.setItem('angel-theme', isDark ? 'dark' : 'light')
  }, [])

  const commands: CommandItem[] = [
    // Navigation
    { id: 'nav-dashboard', label: 'Dashboard', description: 'Go to main dashboard', icon: <LayoutDashboard size={18} />, action: () => router.push('/dashboard'), category: 'Navigation', keywords: ['home', 'overview'] },
    { id: 'nav-projects', label: 'Projects', description: 'View all projects', icon: <FolderKanban size={18} />, action: () => router.push('/projects'), category: 'Navigation' },
    // Project pages (only show if inside a project)
    ...(projectId ? [
      { id: 'proj-intelligence', label: 'Intelligence', description: 'AI project health', icon: <Activity size={18} />, action: () => router.push(`/projects/${projectId}`), category: 'Project', keywords: ['ai', 'health'] },
      { id: 'proj-boq', label: 'Bill of Quantities', description: 'Manage BOQ items', icon: <FileSpreadsheet size={18} />, action: () => router.push(`/projects/${projectId}/boq`), category: 'Project', keywords: ['boq', 'quantities', 'cost'] },
      { id: 'proj-measurements', label: 'Measurements', description: 'Measurement book', icon: <Ruler size={18} />, action: () => router.push(`/projects/${projectId}/measurements`), category: 'Project', keywords: ['measure', 'quantity'] },
      { id: 'proj-drawings', label: 'Drawings', description: 'DWG/DXF viewer', icon: <ImageIcon size={18} />, action: () => router.push(`/projects/${projectId}/drawings`), category: 'Project', keywords: ['dwg', 'dxf', 'cad'] },
      { id: 'proj-rates', label: 'Rate Analysis', description: 'Breakdown rates', icon: <Calculator size={18} />, action: () => router.push(`/projects/${projectId}/rates`), category: 'Project', keywords: ['rate', 'price', 'analysis'] },
      { id: 'proj-quantities', label: 'Quantities', description: 'Quantity tracking', icon: <BarChart3 size={18} />, action: () => router.push(`/projects/${projectId}/quantities`), category: 'Project' },
      { id: 'proj-revisions', label: 'Revisions', description: 'Drawing revisions', icon: <GitCompare size={18} />, action: () => router.push(`/projects/${projectId}/revisions`), category: 'Project' },
      { id: 'proj-tenders', label: 'Tenders', description: 'Manage tenders', icon: <Users size={18} />, action: () => router.push(`/projects/${projectId}/tenders`), category: 'Project', keywords: ['bid', 'contractor'] },
      { id: 'proj-cost', label: 'Cost Control', description: 'Budget & costs', icon: <DollarSign size={18} />, action: () => router.push(`/projects/${projectId}/cost-control`), category: 'Project', keywords: ['budget', 'expense'] },
      { id: 'proj-evm', label: 'EVM', description: 'Earned value management', icon: <TrendingUp size={18} />, action: () => router.push(`/projects/${projectId}/evm`), category: 'Project', keywords: ['earned', 'value', 'spi', 'cpi'] },
      { id: 'proj-payments', label: 'Payments', description: 'Payment certificates', icon: <Receipt size={18} />, action: () => router.push(`/projects/${projectId}/payments`), category: 'Project', keywords: ['ipc', 'certificate', 'invoice'] },
      { id: 'proj-library', label: 'Library', description: 'Pricing library', icon: <BookOpen size={18} />, action: () => router.push(`/projects/${projectId}/library`), category: 'Project' },
      { id: 'proj-reports', label: 'Reports', description: 'Generate reports', icon: <FileBarChart size={18} />, action: () => router.push(`/projects/${projectId}/reports`), category: 'Project', keywords: ['pdf', 'excel', 'export'] },
    ] : []),
    // Actions
    { id: 'action-dark', label: 'Toggle Dark Mode', description: 'Switch theme', icon: <Moon size={18} />, action: toggleDarkMode, category: 'Actions', keywords: ['theme', 'light', 'dark'] },
  ]

  const filtered = query.trim()
    ? commands.filter(cmd => {
        const q = query.toLowerCase()
        return cmd.label.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.keywords?.some(k => k.includes(q))
      })
    : commands

  const categories = [...new Set(filtered.map(c => c.category))]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => { setSelectedIndex(0) }, [query])

  const handleSelect = useCallback((cmd: CommandItem) => {
    setOpen(false)
    cmd.action()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault()
      handleSelect(filtered[selectedIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }, [filtered, selectedIndex, handleSelect])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm text-slate-400 dark:text-slate-500',
          'bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700',
          'hover:bg-slate-200 dark:hover:bg-slate-700/60 hover:text-slate-600 dark:hover:text-slate-300',
          'transition-all duration-200 cursor-pointer'
        )}
      >
        <Search size={15} />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-400 dark:text-slate-500 ms-4">
          <Command size={10} />K
        </kbd>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Command palette">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div className="flex items-start justify-center pt-[15vh] px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -8 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                {/* Search input */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                  <Search size={20} className="text-slate-400 dark:text-slate-500 shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a command or search..."
                    role="combobox"
                    aria-expanded="true"
                    aria-controls="command-palette-list"
                    aria-activedescendant={filtered[selectedIndex] ? `command-item-${filtered[selectedIndex].id}` : undefined}
                    aria-autocomplete="list"
                    className="flex-1 text-base bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <kbd className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-700 rounded text-slate-400 dark:text-slate-500">
                    ESC
                  </kbd>
                </div>

                {/* Results */}
                <div ref={listRef} id="command-palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto py-2">
                  {filtered.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                      No results found for &ldquo;{query}&rdquo;
                    </div>
                  ) : (
                    categories.map(category => {
                      const items = filtered.filter(c => c.category === category)
                      return (
                        <Fragment key={category}>
                          <div className="px-5 py-2">
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                              {category}
                            </span>
                          </div>
                          {items.map(cmd => {
                            const globalIdx = filtered.indexOf(cmd)
                            const isSelected = globalIdx === selectedIndex
                            return (
                              <button
                                key={cmd.id}
                                id={`command-item-${cmd.id}`}
                                role="option"
                                aria-selected={isSelected}
                                data-index={globalIdx}
                                onClick={() => handleSelect(cmd)}
                                onMouseEnter={() => setSelectedIndex(globalIdx)}
                                className={cn(
                                  'w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors',
                                  isSelected
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                )}
                              >
                                <span className={cn(
                                  'shrink-0',
                                  isSelected ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                                )}>
                                  {cmd.icon}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium">{cmd.label}</div>
                                  {cmd.description && (
                                    <div className="text-xs text-slate-400 dark:text-slate-500 truncate">{cmd.description}</div>
                                  )}
                                </div>
                                {isSelected && <ArrowRight size={14} className="text-blue-400 shrink-0" />}
                              </button>
                            )
                          })}
                        </Fragment>
                      )
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">↑↓</kbd> Navigate</span>
                    <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">↵</kbd> Select</span>
                    <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">Esc</kbd> Close</span>
                  </div>
                  <span className="text-[10px] text-slate-300 dark:text-slate-600">ANGEL D.C.</span>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
