import {
  Ruler,
  Table2,
  PenLine,
  BookOpen,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

const MODULES = [
  {
    title: 'Dimension Paper & Take-Off',
    description: 'Standard dimension paper layout, timesing, and squaring methods',
    icon: Table2,
  },
  {
    title: 'Linear, Area & Volume Measurement',
    description: 'Measuring excavation, concrete, formwork, brickwork, and finishes',
    icon: Ruler,
  },
  {
    title: 'Worked Examples',
    description: 'Step-by-step measurement of foundations, slabs, walls, and roofs',
    icon: PenLine,
  },
  {
    title: 'Practice Exercises',
    description: 'Timed exercises with drawings to measure and check your answers',
    icon: BookOpen,
  },
]

export default async function MeasurementPage() {
  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-center gap-4">
        <Link
          href="/student"
          className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={16} className="text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Measurement Sheet Practice</h1>
          <p className="text-slate-500 text-sm mt-1">
            Master quantity take-off with dimension paper exercises and real drawings
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-2">About this module</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Measurement is the core skill of quantity surveying. This module teaches you how to read
          engineering drawings and systematically measure quantities using standard dimension paper,
          covering earthwork, concrete, steel, blockwork, plastering, and finishing trades.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODULES.map((mod) => {
          const Icon = mod.icon
          return (
            <div
              key={mod.title}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Icon size={18} className="text-amber-600" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  Coming soon
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">{mod.title}</h3>
              <p className="text-xs text-slate-500">{mod.description}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
