'use client'

import { Modal } from '@/components/ui/modal'

interface KeyboardShortcutsHelpProps {
  isOpen: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { section: 'Tools', items: [
    { key: 'V', desc: 'Select tool' },
    { key: 'H', desc: 'Pan tool' },
    { key: 'L', desc: 'Line measure' },
    { key: 'P', desc: 'Polyline measure' },
    { key: 'A', desc: 'Area measure' },
    { key: 'R', desc: 'Rectangle measure' },
    { key: 'O', desc: 'Circle measure' },
    { key: 'N', desc: 'Count tool' },
    { key: 'G', desc: 'Polygon tool' },
    { key: 'W', desc: 'Wall Area tool' },
  ]},
  { section: 'Navigation', items: [
    { key: 'Space + Drag', desc: 'Temporary pan' },
    { key: '+ / =', desc: 'Zoom in' },
    { key: '− / _', desc: 'Zoom out' },
    { key: '0', desc: 'Fit to page' },
    { key: '[ / PgUp', desc: 'Previous page' },
    { key: '] / PgDn', desc: 'Next page' },
    { key: 'Scroll', desc: 'Zoom in/out' },
  ]},
  { section: 'Precision', items: [
    { key: 'Shift', desc: 'Constrain to 45° angles' },
    { key: 'Ctrl+G', desc: 'Toggle grid overlay' },
    { key: 'Double-click', desc: 'Complete polyline / area / count' },
  ]},
  { section: 'Actions', items: [
    { key: 'Ctrl+Z', desc: 'Undo last measurement' },
    { key: 'Delete', desc: 'Delete selected' },
    { key: 'Escape', desc: 'Cancel current action' },
    { key: 'Tab', desc: 'Toggle side panel' },
    { key: '?', desc: 'Show shortcuts' },
  ]},
  { section: 'Snap', items: [
    { key: 'Endpoint', desc: 'Snap to line/polyline endpoints' },
    { key: 'Midpoint', desc: 'Snap to segment midpoints' },
    { key: 'Intersection', desc: 'Snap to line intersections' },
    { key: 'Perpendicular', desc: 'Snap perpendicular to a line' },
    { key: 'Parallel', desc: 'Snap parallel to a line' },
    { key: 'Nearest', desc: 'Snap to nearest point on a line' },
    { key: 'Grid', desc: 'Snap to grid points' },
  ]},
]

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="md">
      <div className="space-y-5">
        {SHORTCUTS.map(section => (
          <div key={section.section}>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              {section.section}
            </h4>
            <div className="space-y-1">
              {section.items.map(item => (
                <div key={item.key} className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{item.desc}</span>
                  <kbd className="px-2 py-0.5 text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-600">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
