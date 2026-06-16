'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-3 py-1.5 text-sm rounded bg-amber-600 hover:bg-amber-500 text-white transition-colors"
    >
      Print / Export PDF
    </button>
  )
}
