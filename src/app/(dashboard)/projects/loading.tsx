export default function ProjectsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-32 bg-slate-200 rounded" />
        <div className="h-10 w-36 bg-slate-200 rounded-lg" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="h-12 bg-slate-100 border-b border-slate-200" />
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 last:border-0"
          >
            <div className="h-4 w-48 bg-slate-200 rounded" />
            <div className="h-4 w-24 bg-slate-200 rounded ml-auto" />
            <div className="h-6 w-20 bg-slate-200 rounded-full" />
            <div className="h-4 w-24 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
