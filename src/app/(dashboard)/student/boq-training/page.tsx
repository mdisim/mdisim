import {
  ClipboardList,
  FileText,
  Layers,
  Calculator,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

const TOPICS = [
  {
    title: 'BOQ Structure & Format',
    description: 'Understand preliminaries, preambles, measured work, and provisional sums',
    icon: FileText,
  },
  {
    title: 'Item Descriptions',
    description: 'Writing clear, standard method of measurement-compliant item descriptions',
    icon: ClipboardList,
  },
  {
    title: 'Quantity Take-Off to BOQ',
    description: 'Converting measurement sheets into structured Bills of Quantities',
    icon: Layers,
  },
  {
    title: 'Pricing & Rate Build-Up',
    description: 'Labour, material, equipment, and overhead components in unit rates',
    icon: Calculator,
  },
]

export default async function BOQTrainingPage() {
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
          <h1 className="text-2xl font-bold text-slate-900">BOQ Training</h1>
          <p className="text-slate-500 text-sm mt-1">
            Learn to prepare and price Bills of Quantities for construction projects
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-2">What you will learn</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Bills of Quantities (BOQ) are the backbone of construction cost management. This module
          covers how to read, prepare, and price a BOQ from scratch — from understanding standard
          methods of measurement to building unit rates and preparing tender documents.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TOPICS.map((topic) => {
          const Icon = topic.icon
          return (
            <div
              key={topic.title}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Icon size={18} className="text-violet-600" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  Coming soon
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">{topic.title}</h3>
              <p className="text-xs text-slate-500">{topic.description}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
