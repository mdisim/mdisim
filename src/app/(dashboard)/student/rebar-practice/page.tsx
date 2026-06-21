import {
  Layers,
  Shapes,
  Weight,
  FileSpreadsheet,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

const MODULES = [
  {
    title: 'Shape Codes & Standards',
    description: 'BS 8666 shape codes, bending dimensions, and standard bar shapes',
    icon: Shapes,
  },
  {
    title: 'Bar Bending Schedule Preparation',
    description: 'Creating BBS from structural drawings — member marks, bar marks, and cutting lengths',
    icon: FileSpreadsheet,
  },
  {
    title: 'Weight Calculations',
    description: 'Unit weight tables, total weight computation, and wastage allowances',
    icon: Weight,
  },
  {
    title: 'Practice Drawings',
    description: 'Extract rebar details from beams, columns, slabs, and foundation drawings',
    icon: Layers,
  },
]

export default async function RebarPracticePage() {
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
          <h1 className="text-2xl font-bold text-slate-900">Rebar Calculation Practice</h1>
          <p className="text-slate-500 text-sm mt-1">
            Practice bar bending schedules and reinforcement detailing
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-2">About this module</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Reinforcement detailing is essential for structural quantity surveying. This module covers
          how to read structural drawings, identify bar shapes using BS 8666 shape codes, prepare bar
          bending schedules, and calculate cutting lengths and weights for procurement and cost control.
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
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <Icon size={18} className="text-red-600" />
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
